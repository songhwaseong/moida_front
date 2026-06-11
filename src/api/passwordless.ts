import customAxios from './axiosInstance';
import type { LoginResponse } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export interface PasswordlessLoginStartResponse {
  requestToken: string;
  sessionId: string;
  oneTimeToken: string;
  pushConnectorUrl: string;
  pushConnectorToken: string;
  expiresInSeconds: number;
}

export interface PasswordlessLoginCompleteResponse {
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  login: LoginResponse | null;
}

export interface PasswordlessStatusResponse {
  registered: boolean;
}

export interface PasswordlessRegistrationStartResponse {
  qr: string;
  corpId: string;
  registerKey: string;
  terms: number;
  serverUrl: string;
  userId: string;
  pushConnectorUrl: string;
  pushConnectorToken: string;
  expiresInSeconds: number;
}

export const startPasswordlessLogin = async (email: string) => {
  const response = await customAxios.post<ApiResponse<PasswordlessLoginStartResponse>>(
    '/auth/passwordless/login/start',
    { email }
  );
  return response.data.data;
};

export const completePasswordlessLogin = async (requestToken: string) => {
  const response = await customAxios.post<ApiResponse<PasswordlessLoginCompleteResponse>>(
    '/auth/passwordless/login/complete',
    { requestToken }
  );
  return response.data.data;
};

export const cancelPasswordlessLogin = async (requestToken: string) => {
  await customAxios.post<ApiResponse<null>>('/auth/passwordless/login/cancel', { requestToken });
};

export const getPasswordlessStatus = async () => {
  const response = await customAxios.get<ApiResponse<PasswordlessStatusResponse>>('/members/me/passwordless/status');
  return response.data.data;
};

export const startPasswordlessRegistration = async () => {
  const response = await customAxios.post<ApiResponse<PasswordlessRegistrationStartResponse>>(
    '/members/me/passwordless/registration/start'
  );
  return response.data.data;
};

export const confirmPasswordlessRegistration = async () => {
  const response = await customAxios.post<ApiResponse<PasswordlessStatusResponse>>(
    '/members/me/passwordless/registration/confirm'
  );
  return response.data.data;
};

export const withdrawPasswordless = async () => {
  await customAxios.delete<ApiResponse<null>>('/members/me/passwordless');
};

// 평상시 해지 — 이메일+비밀번호 확인 (로그인 세션 불필요).
// Passwordless 등록 후에는 /auth/login 이 차단되므로 이 공개 엔드포인트로 해지한다.
export const withdrawPasswordlessByPassword = async (email: string, password: string) => {
  await customAxios.post<ApiResponse<null>>('/auth/passwordless/withdraw', { email, password });
};

// 분실 복구 해지 — 이메일 인증 코드 확인 (사전에 send-code/verify-code 완료 필요).
export const withdrawPasswordlessByEmail = async (email: string) => {
  await customAxios.post<ApiResponse<null>>('/auth/passwordless/withdraw-by-email', { email });
};
