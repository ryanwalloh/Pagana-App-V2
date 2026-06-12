import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';

import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItemQuantity,
  type CartItem,
} from '@/api/cart';
import { normalizeApiError } from '@/lib/apiError';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function CartItemRow({ item }: { item: CartItem }) {
  const updateQuantity = useUpdateCartItemQuantity();
  const removeItem = useRemoveCartItem();
  const [error, setError] = useState<string | null>(null);

  const isPending = updateQuantity.isPending || removeItem.isPending;

  const setQuantity = (quantity: number) => {
    setError(null);
    if (quantity < 1) {
      removeItem.mutate(item.id, {
        onError: (err) => setError(normalizeApiError(err).message),
      });
      return;
    }
    updateQuantity.mutate(
      { itemId: item.id, quantity },
      {
        onError: (err) => {
          const normalized = normalizeApiError(err);
          setError(
            normalized.fieldErrors?.product_id?.join(' ') ?? normalized.message,
          );
        },
      },
    );
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        {item.product.image_url ? (
          <img
            src={item.product.image_url}
            alt=""
            className="h-16 w-16 rounded-md object-cover shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded-md bg-muted shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {item.product.display_name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatPrice(item.unit_price)} each
          </p>
          {error && (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center rounded-md border border-border shrink-0">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Decrease quantity of ${item.product.display_name}`}
            disabled={isPending}
            onClick={() => setQuantity(item.quantity - 1)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Increase quantity of ${item.product.display_name}`}
            disabled={isPending}
            onClick={() => setQuantity(item.quantity + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-24 text-right font-medium shrink-0">
          {formatPrice(item.subtotal)}
        </div>

        <Button
          variant="ghost"
          size="sm"
          aria-label={`Remove ${item.product.display_name}`}
          disabled={isPending}
          onClick={() => removeItem.mutate(item.id)}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function CartPage() {
  const { data: cart, isPending, isError, refetch } = useCart();

  if (isPending) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-muted-foreground">We couldn&apos;t load your cart.</p>
        <Button variant="outline" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50" aria-hidden />
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="text-muted-foreground">
          Browse restaurants and add something delicious.
        </p>
        <Button asChild className="bg-brand hover:bg-brand-hover text-white">
          <Link to="/#restaurants">Browse restaurants</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Your cart</h1>
        {cart.merchant && (
          <p className="mt-1 text-muted-foreground">
            From{' '}
            <Link
              to={`/merchants/${cart.merchant.id}`}
              className="text-brand hover:underline"
            >
              {cart.merchant.display_name}
            </Link>
          </p>
        )}
      </header>

      <div className="space-y-3">
        {cart.items.map((item) => (
          <CartItemRow key={item.id} item={item} />
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Delivery and service fees are calculated at checkout.
          </p>
          {/* Routes to /checkout once Milestone 4 lands; disabled until then. */}
          <Button
            className="w-full bg-brand hover:bg-brand-hover text-white"
            disabled
            title="Checkout is coming soon"
          >
            Checkout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
