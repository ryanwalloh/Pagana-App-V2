import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import type { PaymentSummary } from './payments';
import type { Paginated } from './types';
import type { FulfillmentStatus, OrderPaymentStatus } from '@/lib/orderStatus';
import { isTerminalFulfillment } from '@/lib/orderStatus';
import { useAuth } from '@/features/auth/AuthProvider';
import { SUPPRESS_ERROR_TOAST } from '@/lib/toastErrors';
import { apiClient } from './client';

export type PaymentMethod = 'cash_on_delivery' | 'card';

export interface DispatchSummary {
  status: string;
  rider: { id: number } | null;
  location: {
    latitude: string;
    longitude: string;
    updated_at: string;
  } | null;
}

export interface OrderItem {
  id: number;
  product_display_name: string;
  product_description: string;
  quantity: number;
  /** DRF DecimalFields — serialized as strings, e.g. "249.00". */
  unit_price: string;
  subtotal: string;
}

export interface OrderTimelineEvent {
  event_type: string;
  message: string;
  created_at: string;
}

export interface OrderListItem {
  public_id: string;
  merchant: { id: number; display_name: string };
  fulfillment_status: FulfillmentStatus;
  payment_method: PaymentMethod;
  payment_status: OrderPaymentStatus;
  payment_summary: PaymentSummary | null;
  dispatch_summary: DispatchSummary | null;
  total_amount: string;
  created_at: string;
}

export interface OrderDetail {
  public_id: string;
  merchant: { id: number; display_name: string };
  fulfillment_status: FulfillmentStatus;
  payment_method: PaymentMethod;
  payment_status: OrderPaymentStatus;
  payment_summary: PaymentSummary | null;
  dispatch_summary: DispatchSummary | null;
  /** DRF DecimalFields — serialized as strings. */
  item_subtotal: string;
  delivery_fee: string;
  service_fee: string;
  total_amount: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address_line_1: string;
  delivery_address_line_2: string;
  delivery_city: string;
  delivery_state: string;
  delivery_postal_code: string;
  delivery_country: string;
  delivery_notes: string;
  items: OrderItem[];
  timeline_events: OrderTimelineEvent[];
  created_at: string;
  updated_at: string;
}

export interface OrderTracking {
  public_id: string;
  fulfillment_status: FulfillmentStatus;
  payment_status: OrderPaymentStatus;
  payment_summary: PaymentSummary | null;
  dispatch_summary: DispatchSummary | null;
  timeline_events: OrderTimelineEvent[];
  created_at: string;
  updated_at: string;
}

export const ordersApi = {
  listOrders: async (page: number): Promise<Paginated<OrderListItem>> => {
    const response = await apiClient.get<Paginated<OrderListItem>>('/orders', {
      params: { page },
    });
    return response.data;
  },

  getOrder: async (publicId: string): Promise<OrderDetail> => {
    const response = await apiClient.get<OrderDetail>(`/orders/${publicId}`);
    return response.data;
  },

  getTracking: async (publicId: string): Promise<OrderTracking> => {
    const response = await apiClient.get<OrderTracking>(`/orders/${publicId}/tracking`);
    return response.data;
  },
};

export function useOrders() {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ['orders'],
    queryFn: ({ pageParam }) => ordersApi.listOrders(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.next ? allPages.length + 1 : undefined,
    // The endpoint is customer-scoped; never call it for other roles.
    enabled: user?.role === 'customer',
    meta: SUPPRESS_ERROR_TOAST,
  });
}

export function useOrder(publicId: string) {
  return useQuery({
    queryKey: ['orders', publicId],
    queryFn: () => ordersApi.getOrder(publicId),
    meta: SUPPRESS_ERROR_TOAST,
  });
}

/**
 * Tracking with conditional polling: refreshes every 12s while the order is
 * in a non-terminal state, stops at delivered/cancelled. 12s keeps a single
 * watcher at ~5 req/min, well inside the authenticated 120/min throttle.
 */
export const TRACKING_POLL_INTERVAL_MS = 12_000;

/** Pure polling decision: false stops polling, a number keeps it going. */
export function trackingRefetchInterval(
  status: FulfillmentStatus | undefined,
): number | false {
  if (status && isTerminalFulfillment(status)) return false;
  return TRACKING_POLL_INTERVAL_MS;
}

export function useOrderTracking(publicId: string) {
  return useQuery({
    queryKey: ['orders', publicId, 'tracking'],
    queryFn: () => ordersApi.getTracking(publicId),
    refetchInterval: (query) =>
      trackingRefetchInterval(query.state.data?.fulfillment_status),
    meta: SUPPRESS_ERROR_TOAST,
  });
}
