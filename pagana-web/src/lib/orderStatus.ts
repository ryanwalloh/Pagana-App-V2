/** Order status presentation helpers, mirroring the API's model choices. */

export type FulfillmentStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'assigned_to_rider'
  | 'in_transit'
  | 'arrived'
  | 'delivered'
  | 'cancelled';

export type OrderPaymentStatus =
  | 'pending'
  | 'requires_action'
  | 'authorized'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

/** The happy path rendered by the tracking stepper, in order. */
export const FULFILLMENT_STEPS: FulfillmentStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready_for_pickup',
  'assigned_to_rider',
  'in_transit',
  'arrived',
  'delivered',
];

export const FULFILLMENT_LABELS: Record<FulfillmentStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  assigned_to_rider: 'Rider assigned',
  in_transit: 'On the way',
  arrived: 'Rider arrived',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PAYMENT_LABELS: Record<OrderPaymentStatus, string> = {
  pending: 'Payment pending',
  requires_action: 'Action required',
  authorized: 'Authorized',
  succeeded: 'Paid',
  failed: 'Payment failed',
  cancelled: 'Payment cancelled',
  refunded: 'Refunded',
};

export function isTerminalFulfillment(status: string): boolean {
  return status === 'delivered' || status === 'cancelled';
}

/** Index of the status within the happy path; -1 for cancelled/unknown. */
export function fulfillmentStepIndex(status: string): number {
  return FULFILLMENT_STEPS.indexOf(status as FulfillmentStatus);
}

/** Tailwind classes for the fulfillment badge. */
export function fulfillmentBadgeClass(status: string): string {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 'pending':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    default:
      // All in-progress states.
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  }
}

export function paymentBadgeClass(status: string): string {
  switch (status) {
    case 'succeeded':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'failed':
    case 'cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    case 'refunded':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300';
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  }
}
