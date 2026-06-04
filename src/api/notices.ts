import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export type NoticeCategory = '서비스' | '이벤트' | '점검' | '정책';
export type NoticeStatus = '게시중' | '예약' | '숨김';

export interface NoticeDto {
  id: number;
  title: string;
  category: NoticeCategory;
  status: NoticeStatus;
  isPinned: boolean;
  author: string;
  createdAt: string;
  content: string;
  viewCount: number;
}

export interface NoticeRequestDto {
  title: string;
  category: NoticeCategory;
  status: NoticeStatus;
  isPinned: boolean;
  content: string;
}

export const getNotices = async () => {
  const response = await customAxios.get<ApiResponse<NoticeDto[]>>('/notices');
  return unwrap(response);
};

export const getNotice = async (noticeId: number) => {
  const response = await customAxios.get<ApiResponse<NoticeDto>>(`/notices/${noticeId}`);
  return unwrap(response);
};

export const getAdminNotices = async () => {
  const response = await customAxios.get<ApiResponse<NoticeDto[]>>('/admin/notices');
  return unwrap(response);
};

export const createAdminNotice = async (request: NoticeRequestDto) => {
  const response = await customAxios.post<ApiResponse<NoticeDto>>('/admin/notices', request);
  return unwrap(response);
};

export const updateAdminNotice = async (noticeId: number, request: NoticeRequestDto) => {
  const response = await customAxios.put<ApiResponse<NoticeDto>>(`/admin/notices/${noticeId}`, request);
  return unwrap(response);
};

export const deleteAdminNotice = async (noticeId: number) => {
  const response = await customAxios.delete<ApiResponse<null>>(`/admin/notices/${noticeId}`);
  return unwrap(response);
};
