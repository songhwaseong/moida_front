import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

// 백엔드의 회원별 알림 설정 DTO와 동일한 토글 구조입니다.
export interface NotificationSettingDto {
  bidEnabled: boolean;
  priceEnabled: boolean;
  chatEnabled: boolean;
  tradeEnabled: boolean;
  marketingEnabled: boolean;
}

export type NotificationCategory = 'BID' | 'PRICE' | 'CHAT' | 'TRADE' | 'MARKETING' | 'SYSTEM';

// 알림 탭에서 렌더링하는 서버 알림 응답입니다.
export interface NotificationDto {
  id: number;
  type: string;
  category: NotificationCategory;
  title: string;
  content: string;
  linkUrl?: string | null;
  read: boolean;
  createdAt: string | null;
}

interface UnreadCountDto {
  count: number;
}

export const getNotificationSettings = async () => {
  const response = await customAxios.get<ApiResponse<NotificationSettingDto>>('/notifications/settings');
  return unwrap(response);
};

export const updateNotificationSettings = async (request: NotificationSettingDto) => {
  const response = await customAxios.put<ApiResponse<NotificationSettingDto>>('/notifications/settings', request);
  return unwrap(response);
};

export const getNotifications = async (size = 50) => {
  const response = await customAxios.get<ApiResponse<NotificationDto[]>>('/notifications', {
    params: { size },
  });
  return unwrap(response);
};

export const markNotificationAsRead = async (notificationId: number) => {
  const response = await customAxios.patch<ApiResponse<NotificationDto>>(`/notifications/${notificationId}/read`);
  return unwrap(response);
};

export const markAllNotificationsAsRead = async () => {
  const response = await customAxios.patch<ApiResponse<null>>('/notifications/read-all');
  return unwrap(response);
};

export const getUnreadNotificationCount = async () => {
  const response = await customAxios.get<ApiResponse<UnreadCountDto>>('/notifications/unread-count');
  return unwrap(response).count;
};
