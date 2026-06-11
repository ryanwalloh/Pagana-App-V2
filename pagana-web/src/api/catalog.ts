import { useQuery } from '@tanstack/react-query';

import { apiClient } from './client';
import type { Paginated } from './types';

export interface MerchantSummary {
  id: number;
  display_name: string;
  storefront_image_url: string;
  city: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  is_visible: boolean;
  sort_order: number;
}

export interface Product {
  id: number;
  display_name: string;
  description: string;
  price: string;
  image_url: string;
  category: ProductCategory | null;
  merchant: {
    id: number;
    display_name: string;
  };
}

export const catalogApi = {
  listMerchants: async (search?: string): Promise<Paginated<MerchantSummary>> => {
    const response = await apiClient.get<Paginated<MerchantSummary>>('/merchants', {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  getMerchant: async (merchantId: number): Promise<MerchantSummary> => {
    const response = await apiClient.get<MerchantSummary>(`/merchants/${merchantId}`);
    return response.data;
  },

  getMerchantCatalog: async (merchantId: number): Promise<Paginated<Product>> => {
    const response = await apiClient.get<Paginated<Product>>(
      `/merchants/${merchantId}/catalog`,
    );
    return response.data;
  },

  getProduct: async (productId: number): Promise<Product> => {
    const response = await apiClient.get<Product>(`/products/${productId}`);
    return response.data;
  },
};

/**
 * Public data: long stale time and no focus refetch keeps anonymous
 * browsing well under the API's 30/min anonymous throttle.
 */
const PUBLIC_QUERY_OPTIONS = {
  staleTime: 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

export function useMerchants(search?: string) {
  return useQuery({
    queryKey: ['merchants', { search: search ?? '' }],
    queryFn: () => catalogApi.listMerchants(search),
    ...PUBLIC_QUERY_OPTIONS,
  });
}

export function useMerchant(merchantId: number) {
  return useQuery({
    queryKey: ['merchants', merchantId],
    queryFn: () => catalogApi.getMerchant(merchantId),
    ...PUBLIC_QUERY_OPTIONS,
  });
}

export function useMerchantCatalog(merchantId: number) {
  return useQuery({
    queryKey: ['merchants', merchantId, 'catalog'],
    queryFn: () => catalogApi.getMerchantCatalog(merchantId),
    ...PUBLIC_QUERY_OPTIONS,
  });
}

export function useProduct(productId: number | null) {
  return useQuery({
    queryKey: ['products', productId],
    queryFn: () => catalogApi.getProduct(productId as number),
    enabled: productId !== null,
    ...PUBLIC_QUERY_OPTIONS,
  });
}
