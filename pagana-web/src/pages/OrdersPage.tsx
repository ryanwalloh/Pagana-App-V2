import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';

import { useOrders } from '@/api/orders';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FulfillmentBadge, PaymentBadge } from '@/features/orders/StatusBadge';

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function OrdersPage() {
  const {
    data,
    isPending,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrders();

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-3">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-muted-foreground">We couldn&apos;t load your orders.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const orders = data.pages.flatMap((page) => page.results);

  if (orders.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50" aria-hidden />
        <h1 className="text-2xl font-semibold">No orders yet</h1>
        <p className="text-muted-foreground">
          Your order history will appear here once you place your first order.
        </p>
        <Button asChild className="bg-brand hover:bg-brand-hover text-white">
          <Link to="/#restaurants">Browse restaurants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Your orders</h1>

      <div className="space-y-3">
        {orders.map((order) => (
          <Link
            key={order.public_id}
            to={`/orders/${order.public_id}`}
            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <Card className="transition-colors hover:border-brand/50">
              <CardContent className="p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium">{order.merchant.display_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatOrderDate(order.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <FulfillmentBadge status={order.fulfillment_status} />
                  <PaymentBadge status={order.payment_status} />
                </div>
                <div className="w-24 text-right font-semibold">
                  {formatPrice(order.total_amount)}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}
