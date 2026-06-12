import { Link } from 'react-router-dom';
import { ArrowRight, Receipt, Store, UserRound } from 'lucide-react';

import { useCustomerProfile } from '@/api/customers';
import { useOrders } from '@/api/orders';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FulfillmentBadge } from '@/features/orders/StatusBadge';

export default function DashboardPage() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'customer';
  const ordersQuery = useOrders();
  const profileQuery = useCustomerProfile();

  const recentOrders = ordersQuery.data?.pages[0]?.results.slice(0, 3) ?? [];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">
          Welcome back
          {profileQuery.data?.display_name ? `, ${profileQuery.data.display_name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">{user?.email}</p>
      </header>

      {isCustomer && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Recent orders</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-brand">
              <Link to="/orders">
                View all <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {ordersQuery.isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders yet —{' '}
                <Link to="/#restaurants" className="text-brand hover:underline">
                  browse restaurants
                </Link>{' '}
                to place your first one.
              </p>
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.public_id}
                  to={`/orders/${order.public_id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:border-brand/50"
                >
                  <span className="font-medium truncate">
                    {order.merchant.display_name}
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    <FulfillmentBadge status={order.fulfillment_status} />
                    <span className="font-semibold">{formatPrice(order.total_amount)}</span>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/#restaurants" className="block">
          <Card className="h-full transition-colors hover:border-brand/50">
            <CardHeader>
              <Store className="h-6 w-6 text-brand" aria-hidden />
              <CardTitle className="text-base">Order food</CardTitle>
              <CardDescription>Browse open restaurants</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/orders" className="block">
          <Card className="h-full transition-colors hover:border-brand/50">
            <CardHeader>
              <Receipt className="h-6 w-6 text-brand" aria-hidden />
              <CardTitle className="text-base">Your orders</CardTitle>
              <CardDescription>History and live tracking</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/account" className="block">
          <Card className="h-full transition-colors hover:border-brand/50">
            <CardHeader>
              <UserRound className="h-6 w-6 text-brand" aria-hidden />
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>
                {profileQuery.data?.preferred_contact_phone
                  ? 'Profile and delivery defaults'
                  : 'Set delivery defaults for faster checkout'}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
