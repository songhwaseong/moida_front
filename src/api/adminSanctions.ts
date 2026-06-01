import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export type SanctionTypeEnum = 'WARNING' | 'SUSPEND_7' | 'SUSPEND_30' | 'PERMANENT';
export type SanctionTypeLabel = 'warning' | 'suspend_7' | 'suspend_30' | 'permanent';

// 화면 라벨(소문자) ↔ 백엔드 enum 양방향 매핑.
const LABEL_TO_ENUM: Record<SanctionTypeLabel, SanctionTypeEnum> = {
  warning: 'WARNING',
  suspend_7: 'SUSPEND_7',
  suspend_30: 'SUSPEND_30',
  permanent: 'PERMANENT',
};
const ENUM_TO_LABEL: Record<SanctionTypeEnum, SanctionTypeLabel> = {
  WARNING: 'warning',
  SUSPEND_7: 'suspend_7',
  SUSPEND_30: 'suspend_30',
  PERMANENT: 'permanent',
};

export const sanctionLabelToEnum = (label: SanctionTypeLabel) => LABEL_TO_ENUM[label];
export const sanctionEnumToLabel = (e: SanctionTypeEnum) => ENUM_TO_LABEL[e];

export interface AdminSanctionDto {
  id: number;
  memberNo: string;
  memberName: string;
  type: SanctionTypeEnum;
  reason: string;
  adminNote: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminSanctionCreatePayload {
  memberNo: string;
  type: SanctionTypeLabel; // 화면에서 쓰는 라벨로 받고 내부에서 enum 변환
  reason: string;
  adminNote?: string;
}

export const getAdminSanctions = async (): Promise<AdminSanctionDto[]> => {
  const res = await customAxios.get<ApiResponse<AdminSanctionDto[]>>('/admin/sanctions');
  return unwrap(res);
};

export const getAdminSanctionCount = async (): Promise<number> => {
  const res = await customAxios.get<ApiResponse<{ total: number }>>('/admin/sanctions/count');
  return unwrap(res).total ?? 0;
};

export const createAdminSanction = async (payload: AdminSanctionCreatePayload): Promise<AdminSanctionDto> => {
  const res = await customAxios.post<ApiResponse<AdminSanctionDto>>('/admin/sanctions', {
    memberNo: payload.memberNo,
    type: sanctionLabelToEnum(payload.type),
    reason: payload.reason,
    adminNote: payload.adminNote,
  });
  return unwrap(res);
};
