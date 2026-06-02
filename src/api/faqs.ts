import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export interface FaqDto {
  id: number;
  category: string;
  question: string;
  answer: string;
  order: number;
  visible: boolean;
}

export interface FaqRequestDto {
  category: string;
  question: string;
  answer: string;
  order: number;
  visible: boolean;
}

export const getFaqs = async () => {
  const response = await customAxios.get<ApiResponse<FaqDto[]>>('/faqs');
  return unwrap(response);
};

export const getAdminFaqs = async () => {
  const response = await customAxios.get<ApiResponse<FaqDto[]>>('/admin/faqs');
  return unwrap(response);
};

export const createAdminFaq = async (request: FaqRequestDto) => {
  const response = await customAxios.post<ApiResponse<FaqDto>>('/admin/faqs', request);
  return unwrap(response);
};

export const updateAdminFaq = async (faqId: number, request: FaqRequestDto) => {
  const response = await customAxios.put<ApiResponse<FaqDto>>(`/admin/faqs/${faqId}`, request);
  return unwrap(response);
};

export const deleteAdminFaq = async (faqId: number) => {
  const response = await customAxios.delete<ApiResponse<null>>(`/admin/faqs/${faqId}`);
  return unwrap(response);
};
