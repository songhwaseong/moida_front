import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export type SettlementStatusEnum = 'PENDING' | 'PAID' | 'CANCELED';
export type SettlementStatusLabel = '정산완료' | '정산대기' | '보류';

export const STATUS_LABEL: Record<SettlementStatusEnum, SettlementStatusLabel> = {
  PENDING: '정산대기',
  PAID: '정산완료',
  CANCELED: '보류',
};

const LABEL_TO_ENUM: Record<SettlementStatusLabel, SettlementStatusEnum> = {
  '정산완료': 'PAID',
  '정산대기': 'PENDING',
  '보류': 'CANCELED',
};

export const labelToEnum = (label: SettlementStatusLabel) => LABEL_TO_ENUM[label];

export interface AdminSettlementDto {
  id: number;
  sellerNo: string;
  buyerNo: string;
  productName: string;
  type: string;
  saleAmount: number;
  feeRate: number;
  feeAmount: number;
  netAmount: number;
  status: SettlementStatusEnum;
  transactionDate: string;
  settlementDate: string | null;
}

export interface AdminSettlementSummaryDto {
  totalSale: number;
  totalFee: number;
  totalNet: number;
  pending: number;
}

export const getAdminSettlements = async (): Promise<AdminSettlementDto[]> => {
  const res = await customAxios.get<ApiResponse<AdminSettlementDto[]>>('/admin/settlements');
  return unwrap(res);
};

export const getAdminSettlementSummary = async (): Promise<AdminSettlementSummaryDto> => {
  const res = await customAxios.get<ApiResponse<AdminSettlementSummaryDto>>('/admin/settlements/summary');
  return unwrap(res);
};

export const updateAdminSettlementStatus = async (
  settlementId: number,
  label: SettlementStatusLabel,
): Promise<AdminSettlementDto> => {
  const res = await customAxios.patch<ApiResponse<AdminSettlementDto>>(
    `/admin/settlements/${settlementId}/status`,
    { status: labelToEnum(label) },
  );
  return unwrap(res);
};
