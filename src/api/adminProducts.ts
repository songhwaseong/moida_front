import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export type AdminProductStatus =
  | '경매예정'
  | '승인요청중'
  | '보완요청'
  | '경매중'
  | '낙찰'
  | '유찰'
  | '환수요청'
  | '반송중'
  | '환수완료'
  | '숨김';

export interface AdminProductDto {
  id: number;
  productNo: string;
  image: string | null;
  name: string;
  type: '중고거래' | '경매';
  seller: string;
  category: string;
  condition: string;
  price: number;
  status: AdminProductStatus;
  registeredAt: string;
  description: string | null;
  // 관리자 테이블의 송장번호 컬럼/배송조회 모달에 사용. 등록 시 입력값이 없으면 null.
  carrierCode: string | null;
  trackingNo: string | null;
  returnRequestReason: string | null;
  returnRequestedAt: string | null;
  reviewRevisionReason: string | null;
  reviewRevisionRequestedAt: string | null;
}

// 상세 조회 응답. 목록 DTO에 더해 등록된 모든 이미지(images)를 포함한다.
export interface AdminProductDetailDto extends AdminProductDto {
  images: string[];
}

export interface AdminProductStatsDto {
  total: number;
  selling: number;
  approving: number;
  revisionRequested: number;
  inBid: number;
  hidden: number;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

// 화면의 한글 상태 → 백엔드 ProductStatus enum 매핑
const STATUS_TO_ENUM: Record<AdminProductStatus, string> = {
  '경매예정': 'SCHEDULED',
  '승인요청중': 'PENDING',
  '보완요청': 'NEEDS_REVISION',
  '경매중': 'LIVE',
  '낙찰': 'SOLD',
  '유찰': 'FAILED',
  '환수요청': 'RETURN_REQUESTED',
  '반송중': 'RETURN_SHIPPING',
  '환수완료': 'RETURN_COMPLETED',
  '숨김': 'HIDDEN',
};

// 제품상태(컨디션) 표시 라벨 ↔ 백엔드 ProductCondition enum(S/A/B/C) 매핑.
// 백엔드 응답은 enum의 description(라벨)을 내려준다.
export const CONDITION_OPTIONS = [
  '미사용/새상품',
  '거의 새것',
  '사용감 있음',
  '하자 있음',
] as const;

const CONDITION_LABEL_TO_CODE: Record<string, string> = {
  '미사용/새상품': 'S',
  '거의 새것': 'A',
  '사용감 있음': 'B',
  '하자 있음': 'C',
};

// 라벨이면 코드로 변환, 이미 코드(S/A/B/C)면 그대로 사용
export const conditionToCode = (condition: string): string =>
  CONDITION_LABEL_TO_CODE[condition] ?? condition.trim().toUpperCase().charAt(0);

// 상품 목록 조회
export const getAdminProducts = async () => {
  const response = await customAxios.get<ApiResponse<AdminProductDto[]>>('/admin/products');
  return unwrap(response);
};

// 상품 상세 조회 (이미지 전체 포함)
export const getAdminProduct = async (productId: number) => {
  const response = await customAxios.get<ApiResponse<AdminProductDetailDto>>(`/admin/products/${productId}`);
  return unwrap(response);
};

// 상품 통계 조회
export const getAdminProductStats = async () => {
  const response = await customAxios.get<ApiResponse<AdminProductStatsDto>>('/admin/products/stats');
  return unwrap(response);
};

// 상품 정보 수정 (상품명/설명/카테고리/제품상태/가격). null/undefined 필드는 변경하지 않음.
export interface AdminProductUpdatePayload {
  name?: string;
  description?: string;
  category?: string;
  condition?: string; // 라벨 또는 코드(S/A/B/C)
  price?: number;
}

export const updateAdminProduct = async (productId: number, payload: AdminProductUpdatePayload) => {
  await customAxios.patch(`/admin/products/${productId}`, {
    name: payload.name,
    description: payload.description,
    category: payload.category,
    condition: payload.condition != null ? conditionToCode(payload.condition) : undefined,
    price: payload.price,
  });
};

// 상품 상태 변경
export const updateAdminProductStatus = async (
  productId: number,
  status: AdminProductStatus,
  reason: string,
) => {
  await customAxios.patch(`/admin/products/${productId}/status`, {
    status: STATUS_TO_ENUM[status],
    reason,
  });
};

// 상품 삭제 (soft delete)
export const deleteAdminProduct = async (productId: number, reason: string) => {
  await customAxios.delete(`/admin/products/${productId}`, {
    data: { reason },
  });
};
