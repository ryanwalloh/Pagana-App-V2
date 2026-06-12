import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';

import type { Product } from '@/api/catalog';
import { useCart, useClearCart, useSetCartItem } from '@/api/cart';
import { useAuth } from '@/features/auth/AuthProvider';
import { normalizeApiError } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function isCrossMerchantError(error: unknown): boolean {
  const normalized = normalizeApiError(error);
  return (
    normalized.status === 400 &&
    (normalized.fieldErrors?.product_id?.join(' ') ?? '').includes('one merchant')
  );
}

export function AddToCartControl({
  product,
  onAdded,
}: {
  product: Product;
  onAdded?: () => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const cartQuery = useCart();
  const setItem = useSetCartItem();
  const clearCart = useClearCart();

  const cartItem = cartQuery.data?.items.find((item) => item.product.id === product.id);
  const [quantity, setQuantity] = useState(1);
  const [showConflict, setShowConflict] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When the product is already in the cart, start from its current quantity
  // so "set quantity" semantics are visible rather than surprising.
  useEffect(() => {
    if (cartItem) {
      setQuantity(cartItem.quantity);
    }
  }, [cartItem]);

  if (!isAuthenticated) {
    return (
      <Button asChild className="bg-brand hover:bg-brand-hover text-white">
        <Link to="/login" state={{ from: location }}>
          Sign in to order
        </Link>
      </Button>
    );
  }

  if (user?.role !== 'customer') {
    return (
      <p className="text-sm text-muted-foreground">
        Ordering is available for customer accounts.
      </p>
    );
  }

  const submit = (clearFirst: boolean) => {
    setErrorMessage(null);
    const run = async () => {
      if (clearFirst) {
        await clearCart.mutateAsync();
      }
      await setItem.mutateAsync({ productId: product.id, quantity });
    };
    run()
      .then(() => {
        setShowConflict(false);
        onAdded?.();
      })
      .catch((error) => {
        if (!clearFirst && isCrossMerchantError(error)) {
          setShowConflict(true);
          return;
        }
        setErrorMessage(normalizeApiError(error).message);
      });
  };

  const isPending = setItem.isPending || clearCart.isPending;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-md border border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Decrease quantity"
            disabled={quantity <= 1 || isPending}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-10 text-center text-sm font-medium" aria-live="polite">
            {quantity}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Increase quantity"
            disabled={isPending}
            onClick={() => setQuantity((q) => q + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          className="bg-brand hover:bg-brand-hover text-white flex-1"
          disabled={isPending}
          onClick={() => submit(false)}
        >
          {isPending
            ? 'Saving…'
            : cartItem
              ? `Update cart (${quantity})`
              : 'Add to cart'}
        </Button>
      </div>
      {cartItem && (
        <p className="text-xs text-muted-foreground">
          Currently {cartItem.quantity} in your cart — this sets the new quantity.
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Dialog open={showConflict} onOpenChange={setShowConflict}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a new cart?</DialogTitle>
            <DialogDescription>
              Your cart contains items from{' '}
              <span className="font-medium text-foreground">
                {cartQuery.data?.merchant?.display_name ?? 'another restaurant'}
              </span>
              . Ordering from{' '}
              <span className="font-medium text-foreground">
                {product.merchant.display_name}
              </span>{' '}
              will clear your current cart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={isPending}
              onClick={() => setShowConflict(false)}
            >
              Keep current cart
            </Button>
            <Button
              className="bg-brand hover:bg-brand-hover text-white"
              disabled={isPending}
              onClick={() => submit(true)}
            >
              Clear and add
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
