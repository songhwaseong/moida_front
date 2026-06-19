import customAxios from './axiosInstance';
import { getAccessToken } from '../utils/authStorage';

// 서버에 저장된 refresh 토큰을 폐기한다 (POST /api/auth/logout).
//
// 이걸 호출해야 "로그아웃 = 서버 세션 무효화" 가 된다. 호출하지 않으면 브라우저 저장소만
// 비워질 뿐 서버의 refresh 토큰은 만료(최대 14일)까지 살아 있어, 공용 PC/분실 기기/토큰 탈취
// 상황에서 로그아웃이 실제로 세션을 끊지 못한다.
//
// access 토큰을 "명시적으로" 헤더에 실어 호출하는 이유 (인터셉터에 맡기지 않음):
//   1) axios 요청 인터셉터는 "/auth/" 경로엔 토큰을 자동 부착하지 않는다(비로그인 호출 가정).
//   2) 로그아웃 직후 로컬에서 storage 를 비우므로, 토큰을 호출 시점에 동기 캡처해 두지 않으면
//      인터셉터(마이크로태스크)가 토큰을 읽기 전에 storage 가 비워질 수 있다.
//   → 토큰을 동기적으로 캡처해 config 에 직접 넣으면 위 두 가지를 한 번에 피한다.
//
// best-effort: 서버 폐기에 실패하더라도(네트워크 오류·이미 만료된 토큰 등) 로컬 로그아웃은
// 계속 진행되어야 하므로 예외를 삼킨다.
export const logout = async (): Promise<void> => {
  const token = getAccessToken();
  try {
    await customAxios.post('/auth/logout', null, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    // 무시: 로컬 로그아웃 흐름을 막지 않는다.
  }
};
