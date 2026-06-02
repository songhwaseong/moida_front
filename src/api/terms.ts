import customAxios from './axiosInstance';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

export type TermsType = 'TERMS' | 'PRIVACY';

export interface TermsDocumentDto {
  id: number;
  type: TermsType;
  title: string;
  content: string;
  effectiveDate: string | null;
  updatedAt: string | null;
}

export const getTermsDocuments = async () => {
  const response = await customAxios.get<ApiResponse<TermsDocumentDto[]>>('/terms');
  return unwrap(response);
};

export const getTermsDocument = async (type: TermsType) => {
  const response = await customAxios.get<ApiResponse<TermsDocumentDto>>(`/terms/${type}`);
  return unwrap(response);
};
