import { PRODUCTS } from './mockData';

export interface MyProduct {
  id: number;
  images: string[];
  mainImageIndex: number;
  title: string;
  category: string;
  condition: string;
  auctionStartPrice: string;
  minBidUnit: string;
  tradeMethod: string;
  description: string;
  location: string;
  auctionDate: string;
  status: '경매예정' | '승인요청중' | '보완요청' | '경매중' | '낙찰' | '유찰' | '환수요청' | '반송중' | '환수완료' | '숨김';
  price: number;
  timeAgo: string;
}

export const myProductStore: MyProduct[] = [
  {
    id: 1,
    images: [PRODUCTS[0].image],
    mainImageIndex: 0,
    title: PRODUCTS[0].name,
    category: PRODUCTS[0].category,
    condition: PRODUCTS[0].condition,
    auctionStartPrice: '7,000,000',
    minBidUnit: '100,000',
    tradeMethod: '직거래',
    description: '한 번도 사용하지 않은 새 상품입니다. 정품 보증서 포함.',
    location: PRODUCTS[0].location,
    auctionDate: PRODUCTS[0].auctionDate ?? '',
    status: '경매예정',
    price: PRODUCTS[0].price,
    timeAgo: PRODUCTS[0].timeAgo,
  },
  {
    id: 2,
    images: [PRODUCTS[1].image],
    mainImageIndex: 0,
    title: PRODUCTS[1].name,
    category: PRODUCTS[1].category,
    condition: PRODUCTS[1].condition,
    auctionStartPrice: '200,000',
    minBidUnit: '10,000',
    tradeMethod: '택배',
    description: '6개월 사용했으며 스크래치 없습니다.',
    location: PRODUCTS[1].location,
    auctionDate: '',
    status: '낙찰',
    price: PRODUCTS[1].price,
    timeAgo: PRODUCTS[1].timeAgo,
  },
  {
    id: 3,
    images: [PRODUCTS[4].image],
    mainImageIndex: 0,
    title: PRODUCTS[4].name,
    category: PRODUCTS[4].category,
    condition: PRODUCTS[4].condition,
    auctionStartPrice: '250,000',
    minBidUnit: '10,000',
    tradeMethod: '직거래/택배',
    description: '착용 1회 미만 새 제품과 동일합니다. 박스 포함.',
    location: PRODUCTS[4].location,
    auctionDate: PRODUCTS[4].auctionDate ?? '',
    status: '경매예정',
    price: PRODUCTS[4].price,
    timeAgo: '1시간 전',
  },
  {
    id: 4,
    images: [PRODUCTS[2].image],
    mainImageIndex: 0,
    title: PRODUCTS[2].name,
    category: PRODUCTS[2].category,
    condition: PRODUCTS[2].condition,
    auctionStartPrice: '90,000',
    minBidUnit: '5,000',
    tradeMethod: '직거래',
    description: '3년 사용, 패브릭 상태 양호합니다. 분해 가능.',
    location: PRODUCTS[2].location,
    auctionDate: PRODUCTS[2].auctionDate ?? '',
    status: '경매예정',
    price: PRODUCTS[2].price,
    timeAgo: '3시간 전',
  },
  {
    id: 5,
    images: [PRODUCTS[3].image],
    mainImageIndex: 0,
    title: PRODUCTS[3].name,
    category: PRODUCTS[3].category,
    condition: PRODUCTS[3].condition,
    auctionStartPrice: '400,000',
    minBidUnit: '20,000',
    tradeMethod: '직거래',
    description: '2023년 구매, 게임 3종 포함 판매합니다.',
    location: PRODUCTS[3].location,
    auctionDate: '',
    status: '숨김',
    price: PRODUCTS[3].price,
    timeAgo: '5시간 전',
  },
  {
    id: 6,
    images: [PRODUCTS[0].image],
    mainImageIndex: 0,
    title: '빈티지 카메라 (경매 진행 중)',
    category: '전자기기',
    condition: 'A급',
    auctionStartPrice: '150,000',
    minBidUnit: '10,000',
    tradeMethod: '직거래',
    description: '빈티지 필름 카메라, 작동 상태 양호합니다.',
    location: '서울 마포구',
    auctionDate: PRODUCTS[0].auctionDate ?? '',
    status: '경매중',
    price: 150000,
    timeAgo: '30분 전',
  },
  {
    id: 7,
    images: [PRODUCTS[1].image],
    mainImageIndex: 0,
    title: '레트로 무선 키보드',
    category: '전자기기',
    condition: 'B급',
    auctionStartPrice: '50,000',
    minBidUnit: '5,000',
    tradeMethod: '택배',
    description: '1년 사용, 키감 양호합니다.',
    location: '서울 강남구',
    auctionDate: '',
    status: '유찰',
    price: 50000,
    timeAgo: '2일 전',
  },
  {
    id: 8,
    images: [PRODUCTS[2].image],
    mainImageIndex: 0,
    title: '나이키 에어맥스 270 (270mm)',
    category: '패션',
    condition: 'A급',
    auctionStartPrice: '120,000',
    minBidUnit: '5,000',
    tradeMethod: '택배',
    description: '3회 착용, 박스 포함. 오염 없는 깨끗한 상태입니다.',
    location: '서울 송파구',
    auctionDate: '2026.05.10',
    status: '승인요청중',
    price: 120000,
    timeAgo: '1일 전',
  },
  {
    id: 9,
    images: [PRODUCTS[3].image],
    mainImageIndex: 0,
    title: '애플워치 SE 2세대 44mm 스타라이트',
    category: '전자기기',
    condition: 'S급',
    auctionStartPrice: '280,000',
    minBidUnit: '10,000',
    tradeMethod: '직거래/택배',
    description: '구매 후 1개월 사용, 정품 충전기 포함. 기스 없음.',
    location: '경기 성남시',
    auctionDate: '2026.05.12',
    status: '승인요청중',
    price: 280000,
    timeAgo: '2일 전',
  },
  {
    id: 10,
    images: [PRODUCTS[4].image],
    mainImageIndex: 0,
    title: '소니 WH-1000XM5 노이즈캔슬링 헤드폰',
    category: '전자기기',
    condition: 'A급',
    auctionStartPrice: '200,000',
    minBidUnit: '10,000',
    tradeMethod: '택배',
    description: '6개월 사용, 케이스·케이블 모두 포함. 이어패드 상태 양호.',
    location: '서울 마포구',
    auctionDate: '2026.05.15',
    status: '승인요청중',
    price: 200000,
    timeAgo: '3일 전',
  },
];

export const updateMyProduct = (updated: MyProduct) => {
  const idx = myProductStore.findIndex(p => p.id === updated.id);
  if (idx !== -1) myProductStore[idx] = updated;
};

export const addMyProduct = (product: Omit<MyProduct, 'id'>) => {
  const id = Date.now();
  myProductStore.unshift({ ...product, id });
  return id;
};

export const deleteMyProduct = (id: number) => {
  const idx = myProductStore.findIndex(p => p.id === id);
  if (idx !== -1) myProductStore.splice(idx, 1);
};
