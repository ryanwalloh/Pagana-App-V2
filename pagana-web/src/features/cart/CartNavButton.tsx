import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

import { useCart } from '@/api/cart';
import { useAuth } from '@/features/auth/AuthProvider';
import { Button } from '@/components/ui/button';

export function CartNavButton() {
  const { user } = useAuth();
  const { data: cart } = useCart();

  if (user?.role !== 'customer') {
    return null;
  }

  const count = cart?.total_quantity ?? 0;

  return (
    <Button variant="ghost" size="sm" asChild className="relative">
      <Link to="/cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
