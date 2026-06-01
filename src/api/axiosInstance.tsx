// 로그인 인증(JWT)을 자동으로 처리해주는 커스텀 axios 설정 파일
//
// 동작 흐름:
//   1) 모든 요청에 자동으로 accessToken을 Authorization 헤더로 붙임.
//   2) 401 응답을 받으면:
//      a. refreshToken 이 있으면 /api/auth/refresh 로 새 access/refresh 토큰 쌍을 발급받아
//         원래 실패한 요청을 새 토큰으로 1회 자동 재시도한다 (사용자 입장에서 끊김 없음).
//      b. refresh 도 실패하거나 토큰이 아예 없으면 모든 인증 관련 localStorage 를 정리하고
//         '/' 로 리로드해 로그인 화면이 나오게 한다.
//   3) 같은 시점에 여러 요청이 동시에 401 을 받아도 refresh 는 단 1회만 수행되고,
//      대기 중인 요청들은 갱신이 끝난 뒤 새 토큰으로 한꺼번에 재시도된다.

import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/config";
import { disconnectNotificationSocket } from "../components/notificationSocket";

// withCredentials: true 항목은 세션 방식 설정이므로 jwt를 사용하면 삭제하도록 합니다.
const axiosInstance = axios.create({
    baseURL: API_BASE_URL
});

// ─────────────────────────────────────────────────────────────
// Refresh 동시성 제어
// 한 시점에 여러 요청이 동시에 401 을 받으면, refresh 가 N 번 동시에 호출되어
// 마지막 1개를 제외하고는 모두 무효화될 수 있다 (rotation 으로 이전 refresh 가 폐기되는 효과).
// 그래서 진행 중인 refresh Promise 를 모듈 변수에 캐싱하고, 나중에 도착한 요청들은
// 이 Promise 를 await 해서 동일한 새 토큰을 받아 가도록 한다.
let refreshInFlight: Promise<string | null> | null = null;

const refreshTokens = async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return null;

    try {
        // axiosInstance 의 인터셉터 무한 재진입을 피하기 위해 raw axios 로 호출한다.
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const data = response.data?.data as { accessToken?: string; refreshToken?: string } | undefined;
        if (!data?.accessToken) return null;

        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        return data.accessToken;
    } catch {
        return null;
    }
};

const triggerHardLogout = () => {
    // STOMP 알림 소켓도 함께 끊는다.
    // 어차피 직후 window.location.replace 로 페이지가 통째로 새로고침되어 연결이 끊기긴 하지만,
    // 그 사이에 stale token 으로 STOMP 가 자동 reconnect 를 시도하는 짧은 창을 막기 위함.
    void disconnectNotificationSocket();

    // 토큰과 함께 App.tsx 가 로그인 상태로 판단하는 플래그도 같이 정리.
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("moida_logged_in");
    localStorage.removeItem("moida_user_name");
    localStorage.removeItem("moida_user_role");

    // admin 전용 UI 상태(뷰 토글, idle 타이머)도 함께 정리.
    // 핵심: isAdmin 판정 자체가 hasAdminSession() (=token + logged_in + role) 기반이라
    // accessToken/logged_in 만 지워도 isAdmin 은 자동으로 false 가 된다. 그래서 별도 admin 플래그
    // (과거 moida_is_admin) 는 더 이상 존재하지 않는다. 아래 항목들은 단순 UI 상태 정리 용도.
    localStorage.removeItem("moida_admin_view");
    localStorage.removeItem("moida_admin_login_at");
    localStorage.removeItem("moida_admin_idle_warned");

    window.location.replace("/");
};

// ─────────────────────────────────────────────────────────────
// 요청 인터셉터 — Authorization 자동 부착
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        // 로그인/회원가입/소셜로그인 등 auth 엔드포인트에는 토큰을 붙이지 않는다 (이미 비로그인 상태).
        // 단 complete-social-profile 은 토큰이 필요한 후처리이므로 예외 처리.
        const isAuthRequest = config.url?.includes("/auth/") && !config.url?.includes("complete-social-profile");

        if (token && !isAuthRequest) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// ─────────────────────────────────────────────────────────────
// 응답 인터셉터 — 401 시 refresh → 재시도 / 실패 시 강제 로그아웃
//
// 재시도 마킹:
//   원래 요청 config 에 `_retried: true` 표시를 달아 두 번째 401 발생 시(즉 갱신된 토큰으로도 거부)
//   루프 없이 곧장 로그아웃 처리로 빠진다.
interface RetryableConfig extends InternalAxiosRequestConfig {
    _retried?: boolean;
}

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as RetryableConfig | undefined;
        const isAuthRequest = original?.url?.includes("/auth/");

        // 401 이 아니거나, /auth/* 자체 호출이 실패한 경우, 또는 이미 한 번 재시도한 요청이면 그대로 reject.
        // (auth 호출 실패는 비밀번호 오류 등 정상적인 실패이므로 자동 갱신 대상이 아님)
        if (
            error.response?.status !== 401 ||
            isAuthRequest ||
            !original ||
            original._retried
        ) {
            // 다만 위 케이스 중에서도 "다른 API 가 401 + refresh 도 이미 실패해서 진행 불가" 라면
            // 이 시점에 토큰을 정리하는 게 안전. 단순화를 위해 일반 401 (auth 가 아닌) 한정으로 처리.
            if (error.response?.status === 401 && !isAuthRequest && original?._retried) {
                triggerHardLogout();
            }
            return Promise.reject(error);
        }

        // 동시 다발 401 보호: 진행 중인 refresh 가 있으면 그것을 await 하고, 없으면 새로 시작한다.
        if (!refreshInFlight) {
            refreshInFlight = refreshTokens().finally(() => {
                refreshInFlight = null;
            });
        }
        const newAccessToken = await refreshInFlight;

        if (!newAccessToken) {
            // refresh 실패(또는 refreshToken 자체가 없음) → 정상 로그아웃 흐름.
            triggerHardLogout();
            return Promise.reject(error);
        }

        // 새 토큰으로 헤더 갱신 + 재시도 마킹 후 원래 요청 1회 재시도.
        original._retried = true;
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(original as AxiosRequestConfig);
    }
);

export default axiosInstance;
