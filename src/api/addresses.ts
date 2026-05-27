import customAxios from './axiosInstance';
import type { Address } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
}

export type AddressRequest = Omit<Address, 'id'>;

const unwrap = <T>(response: { data: ApiResponse<T> }) => response.data.data;

/**
 * 현재 로그인한 회원의 배송지 주소 목록을 조회합니다.
 */
export const getAddresses = async () => {
  const response = await customAxios.get<ApiResponse<Address[]>>('/addresses');
  return unwrap(response);
};

/**
 * 배송지 주소를 등록합니다.
 */
export const createAddress = async (request: AddressRequest) => {
  const response = await customAxios.post<ApiResponse<Address>>('/addresses', request);
  return unwrap(response);
};

/**
 * 배송지 주소를 수정합니다.
 */
export const updateAddress = async (addressId: number, request: AddressRequest) => {
  const response = await customAxios.put<ApiResponse<Address>>(`/addresses/${addressId}`, request);
  return unwrap(response);
};

/**
 * 배송지 주소를 삭제합니다.
 */
export const deleteAddress = async (addressId: number) => {
  const response = await customAxios.delete<ApiResponse<void>>(`/addresses/${addressId}`);
  return unwrap(response);
};

/**
 * 특정 배송지를 기본 배송지로 설정합니다.
 */
export const setDefaultAddress = async (addressId: number) => {
  const response = await customAxios.put<ApiResponse<Address>>(`/addresses/${addressId}/default`);
  return unwrap(response);
};
