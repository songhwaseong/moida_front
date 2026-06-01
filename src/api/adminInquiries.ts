import customAxios from './axiosInstance';
import type { InquiryResponseDto } from './inquiries';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

// 관리자 상품 문의 목록 조회
export const getAdminInquiries = async (): Promise<InquiryResponseDto[]> => {
  const response = await customAxios.get<ApiResponse<InquiryResponseDto[]>>('/admin/inquiries');
  return unwrap(response);
};

// 답변 작성/수정
export const answerAdminInquiry = async (inquiryId: number, text: string): Promise<InquiryResponseDto> => {
  const response = await customAxios.patch<ApiResponse<InquiryResponseDto>>(
    `/admin/inquiries/${inquiryId}/answer`,
    { text },
  );
  return unwrap(response);
};

// 답변 삭제 (문의는 남김)
export const removeAdminInquiryAnswer = async (inquiryId: number): Promise<void> => {
  await customAxios.delete(`/admin/inquiries/${inquiryId}/answer`);
};

// 문의 자체 삭제
export const deleteAdminInquiry = async (inquiryId: number): Promise<void> => {
  await customAxios.delete(`/admin/inquiries/${inquiryId}`);
};
