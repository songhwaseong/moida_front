import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export interface FeeRuleDto {
  id: number;
  minAmount: number;
  feeRate: number;
  minFee: number;
}

export interface FeeRuleUpdatePayload {
  minAmount?: number;
  feeRate?: number;
}

export const getAdminFeeRules = async (): Promise<FeeRuleDto[]> => {
  const res = await customAxios.get<ApiResponse<FeeRuleDto[]>>('/admin/fee-rules');
  return unwrap(res);
};

export const updateAdminFeeRule = async (id: number, payload: FeeRuleUpdatePayload): Promise<FeeRuleDto> => {
  const res = await customAxios.patch<ApiResponse<FeeRuleDto>>(`/admin/fee-rules/${id}`, payload);
  return unwrap(res);
};
