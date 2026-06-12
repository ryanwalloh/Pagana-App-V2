import {
  FULFILLMENT_LABELS,
  PAYMENT_LABELS,
  fulfillmentBadgeClass,
  paymentBadgeClass,
  type FulfillmentStatus,
  type OrderPaymentStatus,
} from '@/lib/orderStatus';

export function FulfillmentBadge({ status }: { status: FulfillmentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${fulfillmentBadgeClass(status)}`}
    >
      {FULFILLMENT_LABELS[status] ?? status}
    </span>
  );
}

export function PaymentBadge({ status }: { status: OrderPaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${paymentBadgeClass(status)}`}
    >
      {PAYMENT_LABELS[status] ?? status}
    </span>
  );
}
