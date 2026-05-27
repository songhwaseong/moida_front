export interface AuctionItem {
  id: number;
  productNo?: string;
  auctionNo: string;
  name: string;
  image: string;
  currentPrice: number;
  bidCount: number;
  timeLeft: number; // 남은 시간(초)
  isLive: boolean;
  category: string;
  condition?: 'S급' | 'A급' | 'B급' | 'C급';
  liked?: boolean;
  viewCount?: number;
}

export interface BidHistory {
  id: number;
  user: string;
  memberNo: string;
  amount: number;
  time: string;
}

export interface AuctionDetail extends AuctionItem {
  images: string[];
  description: string;
  seller: string;
  sellerTemp: number;
  sellerSales: number;
  ownedByMe?: boolean;
  price?: number;
  startPrice: number;
  minBidUnit?: number;
  immediatePrice?: number;
  endDate: string;
  location: string;
  tags?: ProductTag[];
  canAuction?: boolean;
  auctionDate?: string;
  bidHistory: BidHistory[];
  liked: boolean;
  likeCount: number;
  timeAgo?: string;
}

export interface Product {
  id: number;
  productNo?: string;
  name: string;
  image: string;
  location: string;
  timeAgo: string;
  price: number;
  condition: 'S급' | 'A급' | 'B급' | 'C급';
  tags: ProductTag[];
  likeCount: number;
  viewCount?: number;
  liked: boolean;
  canAuction: boolean;
  auctionDate?: string;
  category: string;
}

export interface ProductDetail extends Product {
  images: string[];
  description: string;
  seller: string;
  sellerTemp: number;
  sellerSales: number;
  ownedByMe?: boolean;
  immediatePrice?: number;
}

export type ProductTag = 'new' | 'auction' | 'free' | 'good';

export interface Address {
  id: number;
  name: string;
  zonecode: string;
  address: string;
  detail: string;
  phone: string;
  isDefault: boolean;
}

export interface Category {
  id: number;
  emoji: string;
  label: string;
  tags?: string[];
}

export type NavTab = 'home' | 'search' | 'notification' | 'chat' | 'my';
export type MainTab = '홈' | '중고거래' | '경매' | '인기' | '관심목록';
