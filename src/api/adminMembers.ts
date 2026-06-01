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

/** 백엔드 AdminMemberResponse 의 status 는 소문자 ("active" | "suspended" | "permanent" | "withdrawn") 임에 주의 */
export type AdminMemberStatusLower = 'active' | 'suspended' | 'permanent' | 'withdrawn';

export interface AdminMemberDto {
  id: number;
  memberNo: string;
  email: string;
  name: string;
  phone: string | null;
  joinedAt: string;
  lastLoginAt: string;
  mannerTemp: number;
  salesCount: number;
  purchaseCount: number;
  bidCount: number;
  reportCount: number;
  sanctionCount: number;
  status: AdminMemberStatusLower;
  suspendUntil: string | null;
  role: 'USER' | 'MANAGER' | 'ADMIN';
}

/** 전체 회원 목록 조회 (대시보드 통계, 회원 목록 페이지 공통) */
export const getAdminMembers = async (): Promise<AdminMemberDto[]> => {
  const response = await customAxios.get<ApiResponse<AdminMemberDto[]>>('/admin/members');
  return unwrap(response);
};

export const getDeactivatedMembers = async () => {
  const response = await customAxios.get<ApiResponse<AdminDeactivatedMemberDto[]>>(
    '/admin/members/deactivated',
  );
  return unwrap(response);
};
