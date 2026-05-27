import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export type AdminMemberStatus = 'ACTIVE' | 'SUSPENDED' | 'PERMANENT' | 'WITHDRAWN';

export interface AdminWithdrawnMemberDto {
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
  status: AdminMemberStatus;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export const getWithdrawnMembers = async () => {
  const response = await customAxios.get<ApiResponse<AdminWithdrawnMemberDto[]>>(
    '/admin/members/withdrawn',
  );
  return unwrap(response);
};
