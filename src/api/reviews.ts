import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export interface ReceivedReviewDto {
  id: number;
  reviewerNickname: string;
  reviewerAvatar: string | null;
  productId: number;
  productName: string;
  productImage: string | null;
  rating: number;
  content: string | null;
  mannerTempChange: number;
  createdAt: string;
}

export const getReceivedReviews = async (size = 50) => {
  const response = await customAxios.get<ApiResponse<ReceivedReviewDto[]>>('/members/me/reviews/received', {
    params: { size },
  });
  return unwrap(response);
};
