import customAxios from './axiosInstance';

interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errorCode?: string;
}

export type EmailVerificationPurpose = 'RESET_PASSWORD' | 'PASSWORDLESS_WITHDRAW';

export const sendEmailCode = async (email: string, purpose: EmailVerificationPurpose) => {
    await customAxios.post<ApiResponse<null>>('/auth/email/send-code', { email, purpose });
};

export const verifyEmailCode = async (email: string, code: string, purpose: EmailVerificationPurpose) => {
    await customAxios.post<ApiResponse<null>>('/auth/email/verify-code', { email, code, purpose });
};

export const resetPassword = async (email: string, newPassword: string) => {
    await customAxios.post<ApiResponse<null>>('/auth/email/reset-password', { email, newPassword });
};
