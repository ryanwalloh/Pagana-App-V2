import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import { useOrder } from '@/api/orders';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrderConfirmationPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const { data: order, isPending, isError } = useOrder(publicId ?? '');

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl space-y-4">
        <Skeleton className="h-10 w-64 mx-auto" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-muted-foreground">We couldn&apos;t find that order.</p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-2xl space-y-6">
      <header className="text-center space-y-2">
        <CheckCircle2 className="h-14 w-14 mx-auto text-brand" aria-hidden />
        <h1 className="text-3xl font-bold">Order placed!</h1>
        <p className="text-muted-foreground">
          {order.merchant.display_name} has been notified and will confirm your order shortly.
        </p>
        <p className="text-sm text-muted-foreground">
          Order number: <span className="font-mono font-medium text-foreground">{order.public_id}</span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity} × {item.product_display_name}
              </span>
              <span className="font-medium">{formatPrice(item.subtotal)}</span>
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
            <div className="flex justify-between text-base font-semibold pt-1">
              <span>Total{order.payment_method === 'cash_on_delivery' && ' (pay on delivery)'}</span>
              <span>{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild className="bg-brand hover:bg-brand-hover text-white">
          <Link to={`/orders/${order.public_id}`}>Track your order</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/#restaurants">Order more</Link>
        </Button>
      </div>
    </div>
  );
}
