import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export const withdrawMe = async () => {
  const response = await customAxios.delete<ApiResponse<null>>('/members/me');
  return unwrap(response);
};
