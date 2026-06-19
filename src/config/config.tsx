// Vite dev server and production nginx both proxy /api to the backend.
export const API_BASE_URL = "/api";
// 카카오 OAuth 설정
export const KKO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID;    // 환경변수에서 읽어옴
export const KKO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI;

// 네이버 OAuth 설정
export const NAV_CLIENT_ID = import.meta.env.VITE_NAVER_CLIENT_ID;
export const NAV_REDIRECT_URI = import.meta.env.VITE_NAVER_REDIRECT_URI;

// 구글 OAuth 설정
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI;