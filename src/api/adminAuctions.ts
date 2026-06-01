import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

/** 백엔드 AuctionStatus enum 이름. READY 는 화면 노출 외에 직접 설정하지 않는다. */
export type AdminAuctionStatusEnum = 'READY' | 'LIVE' | 'SUCCESS' | 'FAILED' | 'CANCELED';

/** 화면 표시용 한글 상태 */
export type AdminAuctionStatusLabel = '대기' | '경매중' | '낙찰' | '유찰' | '취소';

export const STATUS_LABEL: Record<AdminAuctionStatusEnum, AdminAuctionStatusLabel> = {
  READY: '대기',
  LIVE: '경매중',
  SUCCESS: '낙찰',
  FAILED: '유찰',
  CANCELED: '취소',
};

const LABEL_TO_ENUM: Record<AdminAuctionStatusLabel, AdminAuctionStatusEnum> = {
  '대기': 'READY',
  '경매중': 'LIVE',
  '낙찰': 'SUCCESS',
  '유찰': 'FAILED',
  '취소': 'CANCELED',
};

export const labelToEnum = (label: AdminAuctionStatusLabel) => LABEL_TO_ENUM[label];

export interface AdminAuctionDto {
  id: number;
  auctionNo: string;
  productId: number;
  productName: string;
  category: string;
  currentPrice: number;
  startPrice: number;
  bidCount: number;
  timeLeft: number;          // 종료까지 남은 초
  status: AdminAuctionStatusEnum;
  startAt: string;
  endAt: string;
}

export interface AdminAuctionBidDto {
  id: number;
  user: string;
  memberNo: string;
  amount: number;
  time: string;
  isWinning: boolean;
}

// 경매 목록 조회
export const getAdminAuctions = async (): Promise<AdminAuctionDto[]> => {
  const response = await customAxios.get<ApiResponse<AdminAuctionDto[]>>('/admin/auctions');
  return unwrap(response);
};

// 입찰 내역 조회
export const getAdminAuctionBids = async (auctionId: number): Promise<AdminAuctionBidDto[]> => {
  const response = await customAxios.get<ApiResponse<AdminAuctionBidDto[]>>(`/admin/auctions/${auctionId}/bids`);
  return unwrap(response);
};

// 상태 변경. 한글 라벨을 받아 enum 으로 변환해 전송한다.
export const updateAdminAuctionStatus = async (auctionId: number, label: AdminAuctionStatusLabel): Promise<AdminAuctionDto> => {
  const response = await customAxios.patch<ApiResponse<AdminAuctionDto>>(
    `/admin/auctions/${auctionId}/status`,
    { status: labelToEnum(label) },
  );
  return unwrap(response);
};
