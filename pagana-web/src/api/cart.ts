import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { apiClient } from './client';

export interface CartItem {
  id: number;
  product: {
    id: number;
    display_name: string;
    description: string;
    image_url: string;
  };
  quantity: number;
  /** DRF DecimalField — serialized as a string, e.g. "249.00". */
  unit_price: string;
  /** Computed server-side (SerializerMethodField) — serialized as a number. */
  subtotal: number;
}

export interface Cart {
  id: number;
  merchant: { id: number; display_name: string } | null;
  items: CartItem[];
  /** Computed server-side (SerializerMethodField) — serialized as a number. */
  subtotal: number;
  total_quantity: number;
  created_at: string;
  updated_at: string;
}

export const cartApi = {
  getCart: async (): Promise<Cart> => {
    const response = await apiClient.get<Cart>('/cart');
    return response.data;
  },

  /** Upsert: the API sets the item to this quantity (it does not increment). */
  setItem: async (productId: number, quantity: number): Promise<Cart> => {
    const response = await apiClient.post<Cart>('/cart/items', {
      product_id: productId,
      quantity,
    });
    return response.data;
  },

  updateItemQuantity: async (itemId: number, quantity: number): Promise<Cart> => {
    const response = await apiClient.patch<Cart>(`/cart/items/${itemId}`, { quantity });
    return response.data;
  },

  removeItem: async (itemId: number): Promise<void> => {
    await apiClient.delete(`/cart/items/${itemId}`);
  },

  clearCart: async (): Promise<void> => {
    await apiClient.delete('/cart');
  },
};

const CART_KEY = ['cart'] as const;

export function useCart() {
  const { user } = useAuth();
  return useQuery({
    queryKey: CART_KEY,
    queryFn: cartApi.getCart,
    // The cart endpoint is customer-only; never call it for guests or other roles.
    enabled: user?.role === 'customer',
  });
}

function useCartInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: CART_KEY });
}

export function useSetCartItem() {
  const invalidate = useCartInvalidation();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      cartApi.setItem(productId, quantity),
    onSettled: invalidate,
  });
}

export function useUpdateCartItemQuantity() {
  const invalidate = useCartInvalidation();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: number; quantity: number }) =>
      cartApi.updateItemQuantity(itemId, quantity),
    onSettled: invalidate,
  });
}

export function useRemoveCartItem() {
  const invalidate = useCartInvalidation();
  return useMutation({
    mutationFn: (itemId: number) => cartApi.removeItem(itemId),
    onSettled: invalidate,
  });
}

export function useClearCart() {
  const invalidate = useCartInvalidation();
  return useMutation({
    mutationFn: cartApi.clearCart,
    onSettled: invalidate,
  });
}
