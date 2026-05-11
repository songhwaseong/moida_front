// 로그인 인증(JWT)을 자동으로 처리해주는 커스텀 axios 설정 파일

// 즉, API 요청할 때마다 토큰 붙이고
// 인증 실패(401)하면 자동 로그 아웃까지 처리해주는 구조입니다.

import axios from "axios";
import { API_BASE_URL } from "../config/config";

// withCredentials: true 항목은 세션 방식 설정이므로 jwt를 사용하면 삭제하도록 합니다.
const axiosInstance = axios.create({
    baseURL: API_BASE_URL
});

// 인터셉터(interceptor) : 요청(Request)이나 응답(Response)을 가로 채서 공통 로직을 처리하는 기능입니다.
// 요청을 보내기 전에 인터셉터가 자동으로 JWT 붙이기
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");
        console.log("interceptors.request 토큰 확인 : ", token);

        if (token) { // token가 undefined일 수 있으므로...
            config.headers = config.headers || {};
            // Bearer 단어 대소문자 주의 바람
            config.headers.Authorization = `Bearer ${token}`; // 토큰을 들고 간다
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// 응답 처리 : 401 에러 발생 시 자동 로그 아웃 처리
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {

        const isLoginRequest = error.config?.url?.includes("/api/auth/login");

        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem("accessToken");

            // window.location.href 사용시 React Router 사용 중이면 
            // 페이지 전체 리로드 발생할 수 있으므로 replace() 메소드 사용 바람
            window.location.replace("/member/login");
        }

        return Promise.reject(error);
    }
);

export default axiosInstance;