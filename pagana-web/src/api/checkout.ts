import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CartItem } from './cart';
import type { OrderDetail, PaymentMethod } from './orders';
import { SUPPRESS_ERROR_TOAST } from '@/lib/toastErrors';
import { apiClient } from './client';

/** Exact field set accepted by POST /checkout/prepare and /checkout/confirm. */
export interface DeliveryDetails {
  recipient_name: string;
  recipient_phone: string;
  delivery_address_line_1: string;
  delivery_address_line_2?: string;
  delivery_city: string;
  delivery_state?: string;
  delivery_postal_code: string;
  /** ISO-2 country code. */
  delivery_country: string;
  delivery_notes?: string;
}

export interface CheckoutPrepareResponse {
  merchant: { id: number; display_name: string };
  items: CartItem[];
  /** Computed server-side (Decimal via JSON encoder) — serialized as numbers. */
  item_subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total_amount: number;
  allowed_payment_methods: PaymentMethod[];
}

export interface CheckoutConfirmPayload extends DeliveryDetails {
  payment_method: PaymentMethod;
  idempotency_key: string;
}

export const checkoutApi = {
  prepare: async (details: DeliveryDetails): Promise<CheckoutPrepareResponse> => {
    const response = await apiClient.post<CheckoutPrepareResponse>(
      '/checkout/prepare',
      details,
    );
    return response.data;
  },

  confirm: async (payload: CheckoutConfirmPayload): Promise<OrderDetail> => {
    const response = await apiClient.post<OrderDetail>('/checkout/confirm', payload);
    return response.data;
  },
};

export function useCheckoutPrepare() {
  return useMutation({ mutationFn: checkoutApi.prepare, meta: SUPPRESS_ERROR_TOAST });
}

export function useCheckoutConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkoutApi.confirm,
    meta: SUPPRESS_ERROR_TOAST,
    onSuccess: (order) => {
      // The server empties the cart on success; drop the stale local copy
      // and seed the order cache so the confirmation screen renders instantly.
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.setQueryData(['orders', order.public_id], order);
    },
  });
}
