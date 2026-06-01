import customAxios from './axiosInstance';
import type { BidHistory } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export interface BidResultDto {
  currentPrice: number;
  bidCount: number;
  isLive: boolean;
  bidHistory: BidHistory[];
}

export interface MyBidDto {
  id: number;
  productId: number;
  productNo: string;
  auctionNo: string;
  name: string;
  image: string;
  category: string;
  condition: string;
  myBidAmount: number;
  currentPrice: number;
  bidCount: number;
  timeLeft: number;
  isLive: boolean;
  status: 'BIDDING' | 'WON' | 'FAILED';
  bidTime: string;
}

export type BidType = 'NORMAL' | 'IMMEDIATE';

export const placeProductBid = async (
  productId: number,
  amount: number,
) => {
  const response = await customAxios.post<ApiResponse<BidResultDto>>(`/products/${productId}/bids`, {
    amount,
    bidType: 'NORMAL' satisfies BidType,
  });
  return response.data.data;
};

export const buyNowProduct = async (productId: number) => {
  const response = await customAxios.post<ApiResponse<BidResultDto>>(`/products/${productId}/bids/immediate`);
  return response.data.data;
};

export const getMyBids = async () => {
  const response = await customAxios.get<ApiResponse<MyBidDto[]>>('/products/bids/me');
  return response.data.data;
};

/**
 * AWAITING_PAYMENT 상태 경매의 결제 트리거.
 * 백엔드 AuctionCompletionService.payForWinningAuction → 잔액 차감 + Settlement 생성 + SUCCESS 전환.
 * 잔액 부족/기한 만료/낙찰자 아님 등은 BusinessException 으로 내려와 axios catch 에서 처리된다.
 */
export const payForAuction = async (productId: number) => {
  const response = await customAxios.post<ApiResponse<null>>(`/products/${productId}/payment`);
  return response.data;
};
