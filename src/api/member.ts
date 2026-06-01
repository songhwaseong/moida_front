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

export interface UpdateProfileRequest {
  nickname: string;
  phone: string;
  avatar: string;
}

export interface MemberProfileResponse {
  nickname: string;
  email: string;
  memberNo: string;
  phone: string;
  mannerTemp: number;
  salesCount: number;
  purchaseCount: number;
  bidCount: number;
  avatar: string;
  socialLogin: string | null;
}

export const getMyProfile = async () => {
  const response = await customAxios.get<ApiResponse<MemberProfileResponse>>('/members/me');
  return unwrap(response);
};

export const updateMyProfile = async (request: UpdateProfileRequest) => {
  const response = await customAxios.put<ApiResponse<null>>('/members/me', request);
  return unwrap(response);
};

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const changePassword = async (request: ChangePasswordRequest) => {
  const response = await customAxios.patch<ApiResponse<null>>('/members/me/password', request);
  return unwrap(response);
};
