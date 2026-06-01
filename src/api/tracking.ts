import customAxios from './axiosInstance';

/**
 * API 공통 응답 포맷 인터페이스
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

/**
 * 배송 상세 단계 (스마트택배 trackingDetails 기반, 최신순)
 */
export interface TrackingStepDto {
  time: string | null;
  location: string | null;
  status: string | null;
  level: number;
}

/**
 * 배송 조회 결과 데이터 인터페이스
 */
export interface TrackingDto {
  carrier: string;
  trackingNo: string;
  product: string | null;
  currentStatus: string | null;
  estimatedDate: string | null;
  complete: boolean;
  level: number;
  steps: TrackingStepDto[];
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

/**
 * 택배사 코드(스마트택배 t_code)와 송장번호로 배송 정보를 조회합니다.
 */
export const getTracking = async (carrier: string, invoice: string) => {
  const response = await customAxios.get<ApiResponse<TrackingDto>>('/tracking', {
    params: { carrier, invoice },
  });
  return unwrap(response);
};
