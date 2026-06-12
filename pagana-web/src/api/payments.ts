import { useMutation, useQuery } from '@tanstack/react-query';

import type { PaymentMethod } from './orders';
import { apiClient } from './client';
import { SUPPRESS_ERROR_TOAST } from '@/lib/toastErrors';

export type PaymentAttemptStatus =
  | 'pending'
  | 'requires_action'
  | 'authorized'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface PaymentIntentResponse {
  id: number;
  provider: string;
  method_type: PaymentMethod;
  status: PaymentAttemptStatus;
  /** DRF DecimalField — string, e.g. "498.00". */
  amount: string;
  currency: string;
  provider_payment_intent_id: string;
  provider_client_secret: string;
  created_at: string;
  updated_at: string;
}

export type PaymentSummary = Omit<PaymentIntentResponse, 'provider_client_secret'>;

export interface OrderPaymentSummary {
  order_public_id: string;
  payment_method: PaymentMethod;
  /** Order-level payment status, synced from webhooks — the authoritative value. */
  payment_status: string;
  latest_attempt: PaymentSummary | null;
}

export const paymentsApi = {
  /** Idempotent server-side: re-calling returns the existing active intent. */
  createIntent: async (orderPublicId: string): Promise<PaymentIntentResponse> => {
    const response = await apiClient.post<PaymentIntentResponse>(
      `/payments/orders/${orderPublicId}/intent`,
    );
    return response.data;
  },

  getSummary: async (orderPublicId: string): Promise<OrderPaymentSummary> => {
    const response = await apiClient.get<OrderPaymentSummary>(
      `/payments/orders/${orderPublicId}`,
    );
    return response.data;
  },
};

export function useCreatePaymentIntent() {
  return useMutation({
    mutationFn: (orderPublicId: string) => paymentsApi.createIntent(orderPublicId),
    meta: SUPPRESS_ERROR_TOAST,
  });
}

export const TERMINAL_PAYMENT_STATUSES = ['succeeded', 'failed', 'cancelled'];

/**
 * Payment summary with optional polling. The webhook is the source of truth
 * for payment status, so after confirmPayment the client polls until the
 * order reaches a terminal state.
 */
export function useOrderPaymentSummary(orderPublicId: string, poll: boolean) {
  return useQuery({
    queryKey: ['payments', orderPublicId],
    queryFn: () => paymentsApi.getSummary(orderPublicId),
    refetchInterval: (query) => {
      if (!poll) return false;
      const status = query.state.data?.payment_status;
      return status && TERMINAL_PAYMENT_STATUSES.includes(status) ? false : 3000;
    },
    meta: SUPPRESS_ERROR_TOAST,
  });
}
