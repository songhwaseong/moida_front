import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export type AdminMemberStatus = 'ACTIVE' | 'SUSPENDED' | 'PERMANENT' | 'WITHDRAWN';

export interface AdminDeactivatedMemberDto {
  id: number;
  memberNo: string;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string;
  lastLoginAt: string | null;
  withdrawnAt: string | null;
  mannerTemp: number;
  salesCount: number;
  purchaseCount: number;
  bidCount: number;
  reportCount: number;
  sanctionCount: number;
  deactivationReasonCode: string | null;
  deactivationReasonDetail: string | null;
  status: AdminMemberStatus;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export const getDeactivatedMembers = async () => {
  const response = await customAxios.get<ApiResponse<AdminDeactivatedMemberDto[]>>(
    '/admin/members/deactivated',
  );
  return unwrap(response);
};
