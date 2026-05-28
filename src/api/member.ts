import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export interface DeactivateAccountRequest {
  password?: string;
  confirmationText?: string;
  reasonCode: string;
  reasonDetail?: string;
}

export type AccountDeactivationAuthMethod = 'PASSWORD' | 'SOCIAL_CONFIRMATION';

export interface AccountDeactivationInfoDto {
  authenticationMethod: AccountDeactivationAuthMethod;
  socialLogin: string | null;
  confirmationText: string | null;
}

export const getAccountDeactivationInfo = async () => {
  const response = await customAxios.get<ApiResponse<AccountDeactivationInfoDto>>('/members/me/deactivation-info');
  return unwrap(response);
};

export const deactivateMyAccount = async (request: DeactivateAccountRequest) => {
  const response = await customAxios.delete<ApiResponse<null>>('/members/me', {
    data: request,
  });
  return unwrap(response);
};
