import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export interface AdminCategoryDto {
  id: number;
  name: string;
  emoji: string | null;
  displayOrder: number;
  visible: boolean;
}

export interface ReorderItem {
  id: number;
  displayOrder: number;
}

export const getAdminCategories = async (): Promise<AdminCategoryDto[]> => {
  const res = await customAxios.get<ApiResponse<AdminCategoryDto[]>>('/admin/categories');
  return unwrap(res);
};

export const setCategoryVisibility = async (id: number, visible: boolean): Promise<AdminCategoryDto> => {
  const res = await customAxios.patch<ApiResponse<AdminCategoryDto>>(
    `/admin/categories/${id}/visibility`,
    { visible },
  );
  return unwrap(res);
};

export const reorderCategories = async (orders: ReorderItem[]): Promise<AdminCategoryDto[]> => {
  const res = await customAxios.patch<ApiResponse<AdminCategoryDto[]>>(
    '/admin/categories/reorder',
    { orders },
  );
  return unwrap(res);
};
