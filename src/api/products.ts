import customAxios from './axiosInstance';
import type { AuctionDetail, AuctionItem, BidHistory, Product, ProductDetail } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export interface ProductSummaryDto {
  id: number;
  productNo: string;
  name: string;
  image: string;
  location: string;
  timeAgo: string;
  price: number;
  condition: Product['condition'];
  tags: Product['tags'];
  likeCount: number;
  viewCount: number;
  liked: boolean;
  canAuction: boolean;
  auctionDate?: string | null;
  category: string;
  type: 'AUCTION';
  status?: 'SCHEDULED' | 'PENDING' | 'LIVE' | 'SOLD' | 'FAILED' | 'HIDDEN' | 'DELETED';
  auctionNo?: string | null;
  currentPrice?: number | null;
  bidCount?: number | null;
  timeLeft?: number | null;
  isLive?: boolean | null;
}

export interface ProductDetailDto extends ProductSummaryDto {
  images: string[];
  description: string;
  carrierCode?: string | null;
  trackingNo?: string | null;
  seller: string;
  sellerTemp: number;
  sellerSales: number;
  ownedByMe?: boolean | null;
  immediatePrice?: number | null;
  startPrice?: number | null;
  minBidUnit?: number | null;
  endDate?: string | null;
  bidHistory?: BidHistory[];
  // 결제 대기 흐름용 필드
  auctionStatus?: 'READY' | 'LIVE' | 'AWAITING_PAYMENT' | 'SUCCESS' | 'FAILED' | 'CANCELED' | null;
  paymentDeadline?: string | null;
  isWinner?: boolean | null;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

// 백엔드 상품 조회 응답을 기존 카드 컴포넌트가 쓰는 타입으로 변환한다.
// 화면 컴포넌트 쪽 변경 범위를 줄이기 위해 API DTO와 UI 타입을 여기서 분리한다.
export type ProductStatusFilter =
  | 'SCHEDULED'
  | 'PENDING'
  | 'LIVE'
  | 'SOLD'
  | 'FAILED';

// 상품 목록 정렬 키.
//   - 'popular'    : 백엔드에서 viewCount DESC, id DESC 순으로 처리 (인기 화면용)
//   - 'price_asc'  : 카드에 표시되는 가격(=auction.currentPrice, 없으면 product.price) 오름차순
//   - 'price_desc' : 같은 기준 내림차순
// 미지정(undefined)이면 백엔드 기본값(createdAt DESC = 최신 등록순).
export type ProductSortKey = 'popular' | 'price_asc' | 'price_desc';

// 상품 목록 조회 API. 카테고리/상태/정렬/페이지크기 파라미터는 모두 선택적이며,
// 서버 쪽에서는 "category 필터 → 상태 필터 → 정렬 → size 클램프(최대 100)" 순으로 처리한다.
export const getProducts = async (params?: {
  category?: string | null;
  status?: ProductStatusFilter;
  sort?: ProductSortKey;
  size?: number;
}) => {
  const response = await customAxios.get<ApiResponse<ProductSummaryDto[]>>('/products', {
    params: {
      category: params?.category || undefined,
      status: params?.status,
      sort: params?.sort,
      size: params?.size,
    },
  });
  return unwrap(response);
};

export const getProduct = async (productId: number) => {
  const response = await customAxios.get<ApiResponse<ProductDetailDto>>(`/products/${productId}`);
  return unwrap(response);
};

export const getMyProducts = async () => {
  const response = await customAxios.get<ApiResponse<ProductSummaryDto[]>>('/products/me');
  return unwrap(response);
};

export const toProduct = (item: ProductSummaryDto): Product => ({
  id: item.id,
  productNo: item.productNo,
  name: item.name,
  image: item.image,
  location: item.location,
  timeAgo: item.timeAgo,
  price: item.price,
  condition: item.condition,
  tags: item.tags,
  likeCount: item.likeCount,
  viewCount: item.viewCount,
  liked: item.liked,
  canAuction: item.canAuction,
  auctionDate: item.auctionDate ?? undefined,
  category: item.category,
});

export const toAuctionItem = (item: ProductSummaryDto): AuctionItem => ({
  id: item.id,
  productNo: item.productNo,
  auctionNo: item.auctionNo ?? item.productNo,
  name: item.name,
  image: item.image,
  currentPrice: item.currentPrice ?? item.price,
  bidCount: item.bidCount ?? 0,
  timeLeft: item.timeLeft ?? 0,
  isLive: item.isLive ?? false,
  category: item.category,
  condition: item.condition,
  liked: item.liked,
  viewCount: item.viewCount,
});

export const toProductDetail = (item: ProductDetailDto): ProductDetail => ({
  ...toProduct(item),
  images: item.images.length > 0 ? item.images : [item.image],
  description: item.description,
  seller: item.seller,
  sellerTemp: item.sellerTemp,
  sellerSales: item.sellerSales,
  ownedByMe: item.ownedByMe ?? false,
  immediatePrice: item.immediatePrice ?? undefined,
});

// 경매 상세 화면은 상품 상세 API를 재사용하되, 경매 전용 필드를 AuctionDetail 형태로 맞춰준다.
// 백엔드에 경매 row가 없는 상품도 화면이 깨지지 않도록 기본값을 보정한다.
export const toAuctionDetail = (item: ProductDetailDto): AuctionDetail => ({
  ...toAuctionItem(item),
  images: item.images.length > 0 ? item.images : [item.image],
  description: item.description,
  seller: item.seller,
  sellerTemp: item.sellerTemp,
  sellerSales: item.sellerSales,
  ownedByMe: item.ownedByMe ?? false,
  startPrice: item.startPrice ?? item.price,
  minBidUnit: item.minBidUnit ?? 1000,
  immediatePrice: item.immediatePrice ?? undefined,
  endDate: item.endDate ?? item.auctionDate ?? '미정',
  location: item.location,
  bidHistory: item.bidHistory ?? [],
  liked: item.liked,
  likeCount: item.likeCount,
  timeAgo: item.timeAgo,
  auctionStatus: item.auctionStatus ?? null,
  paymentDeadline: item.paymentDeadline ?? null,
  isWinner: item.isWinner ?? false,
});
