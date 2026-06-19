import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

// 인증번호 발송 요청
export type PhoneVerificationPurpose =
  | 'SIGNUP'
  | 'COMPLETE_SOCIAL_PROFILE'
  | 'FIND_ID'
  | 'SELLER_PHONE';

export const sendPhoneCode = async (phone: string, purpose: PhoneVerificationPurpose) => {
  await customAxios.post<ApiResponse<null>>('/auth/phone/send', { phone, purpose });
};

// 인증번호 검증
export const verifyPhoneCode = async (phone: string, code: string, purpose: PhoneVerificationPurpose) => {
  await customAxios.post<ApiResponse<null>>('/auth/phone/verify', { phone, code, purpose });
};
