import { Link, useParams } from 'react-router-dom';
import { Bike } from 'lucide-react';

import { useOrder, useOrderTracking } from '@/api/orders';
import { normalizeApiError } from '@/lib/apiError';
import { formatPrice } from '@/lib/currency';
import { PAYMENT_LABELS } from '@/lib/orderStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderTimeline } from '@/features/orders/OrderTimeline';
import { PaymentBadge } from '@/features/orders/StatusBadge';
import { TrackingStepper } from '@/features/orders/TrackingStepper';

export default function OrderDetailPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const orderQuery = useOrder(publicId ?? '');
  // Live data: stepper, timeline, dispatch. Polls while non-terminal.
  const trackingQuery = useOrderTracking(publicId ?? '');

  if (orderQuery.isPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (orderQuery.isError) {
    const status = normalizeApiError(orderQuery.error).status;
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          {status === 404 ? 'Order not found' : "We couldn't load this order"}
        </h1>
        <p className="text-muted-foreground">
          {status === 404
            ? 'This order does not exist or belongs to a different account.'
            : 'Please try again in a moment.'}
        </p>
        <Button asChild variant="outline">
          <Link to="/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  const order = orderQuery.data;
  // Tracking is fresher than the detail snapshot once polling kicks in.
  const fulfillmentStatus =
    trackingQuery.data?.fulfillment_status ?? order.fulfillment_status;
  const paymentStatus = trackingQuery.data?.payment_status ?? order.payment_status;
  const timelineEvents = trackingQuery.data?.timeline_events ?? order.timeline_events;
  const dispatch = trackingQuery.data?.dispatch_summary ?? order.dispatch_summary;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{order.merchant.display_name}</h1>
          <p className="text-sm text-muted-foreground">
            Order <span className="font-mono">{order.public_id}</span>
          </p>
        </div>
        <PaymentBadge status={paymentStatus} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order status</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingStepper status={fulfillmentStatus} />
        </CardContent>
      </Card>

      {dispatch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bike className="h-5 w-5 text-brand" aria-hidden />
              Delivery
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>
              Assignment status:{' '}
              <span className="font-medium">{dispatch.status.replace(/_/g, ' ')}</span>
            </p>
            {dispatch.rider && <p>Rider #{dispatch.rider.id} is handling your delivery.</p>}
            {dispatch.location && (
              <p className="text-muted-foreground">
                Last known rider position: {dispatch.location.latitude},{' '}
                {dispatch.location.longitude} (updated{' '}
                {new Date(dispatch.location.updated_at).toLocaleTimeString()})
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {/* Historical snapshots — never re-fetched from the live catalog. */}
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span>
                  {item.quantity} × {item.product_display_name}
                </span>
                <span className="font-medium shrink-0">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-3 mt-3 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.item_subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service fee</span>
                <span>{formatPrice(order.service_fee)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1">
                <span>Total</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {order.payment_method === 'cash_on_delivery'
                ? 'Cash on delivery'
                : 'Paid by card'}
              {' · '}
              {PAYMENT_LABELS[paymentStatus] ?? paymentStatus}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Delivering to</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">
              {order.recipient_name} · {order.recipient_phone}
            </p>
            <p className="text-muted-foreground">
              {order.delivery_address_line_1}
              {order.delivery_address_line_2 && `, ${order.delivery_address_line_2}`}
            </p>
            <p className="text-muted-foreground">
              {order.delivery_city}
              {order.delivery_state && `, ${order.delivery_state}`}{' '}
              {order.delivery_postal_code}, {order.delivery_country}
            </p>
            {order.delivery_notes && (
              <p className="text-muted-foreground italic">{order.delivery_notes}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline events={timelineEvents} />
        </CardContent>
      </Card>
    </div>
  );
}
