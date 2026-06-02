import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export type GuideType = 'BUY' | 'SELL' | 'AUCTION';

export interface GuideStepDto {
  icon: string;
  title: string;
  description: string;
}

export interface GuideTipDto {
  icon: string;
  text: string;
  warning: boolean;
}

export interface GuideDto {
  type: GuideType;
  tabLabel: string;
  bannerLabel: string;
  bannerTitle: string;
  bannerDescription: string;
  steps: GuideStepDto[];
  tips: GuideTipDto[];
}

export const getGuides = async () => {
  const response = await customAxios.get<ApiResponse<GuideDto[]>>('/guides');
  return unwrap(response);
};
