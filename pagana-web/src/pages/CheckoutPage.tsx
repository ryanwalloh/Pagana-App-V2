import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useCart } from '@/api/cart';
import { useCheckoutPrepare, useCheckoutConfirm } from '@/api/checkout';
import type { CheckoutPrepareResponse } from '@/api/checkout';
import { useCustomerProfile } from '@/api/customers';
import type { PaymentMethod } from '@/api/orders';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DeliveryDetailsForm } from '@/features/checkout/DeliveryDetailsForm';
import { PaymentMethodSelector } from '@/features/checkout/PaymentMethodSelector';
import { getCheckoutBlocker } from '@/features/checkout/checkoutErrors';
import {
  cartSignature,
  clearIdempotencyKey,
  getIdempotencyKey,
} from '@/features/checkout/idempotency';
import {
  emptyDeliveryValues,
  type DeliveryFormValues,
} from '@/features/checkout/deliverySchema';

type Step = 'details' | 'review';

function StepIndicator({ step }: { step: Step }) {
  const steps: Array<{ id: Step; label: string; shortLabel: string }> = [
    { id: 'details', label: 'Delivery details', shortLabel: 'Details' },
    { id: 'review', label: 'Review and place order', shortLabel: 'Review' },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <ol
      className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2"
      aria-label="Checkout progress"
    >
      {steps.map((s, index) => (
        <li key={s.id} className="flex items-center gap-2">
          {index > 0 && (
            <span className="hidden sm:inline text-muted-foreground/50" aria-hidden>
              →
            </span>
          )}
          <span
            aria-current={s.id === step ? 'step' : undefined}
            className={
              index <= activeIndex
                ? 'font-medium text-brand'
                : 'text-muted-foreground'
            }
          >
            <span className="sm:hidden">{s.shortLabel}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const cartQuery = useCart();
  const profileQuery = useCustomerProfile();
  const prepare = useCheckoutPrepare();
  const confirm = useCheckoutConfirm();

  const [step, setStep] = useState<Step>('details');
  const [details, setDetails] = useState<DeliveryFormValues | null>(null);
  const [summary, setSummary] = useState<CheckoutPrepareResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');

  const bounceToCart = (message: string) => {
    toast.error(message);
    navigate('/cart', { replace: true });
  };

  const handleDetailsSubmit = async (values: DeliveryFormValues) => {
    try {
      const response = await prepare.mutateAsync(values);
      setDetails(values);
      setSummary(response);
      if (!response.allowed_payment_methods.includes(paymentMethod)) {
        setPaymentMethod(response.allowed_payment_methods[0]);
      }
      setStep('review');
    } catch (error) {
      const blocker = getCheckoutBlocker(error);
      if (blocker) {
        bounceToCart(blocker);
        return;
      }
      throw error; // Field errors — the form maps them onto inputs.
    }
  };

  const handleConfirm = () => {
    if (!details || !cartQuery.data) return;

    const key = getIdempotencyKey(
      cartSignature(
        cartQuery.data.items.map((item) => ({
          id: item.product.id,
          quantity: item.quantity,
        })),
      ),
    );

    confirm.mutate(
      { ...details, payment_method: paymentMethod, idempotency_key: key },
      {
        onSuccess: (order) => {
          clearIdempotencyKey();
          // COD orders are complete; card orders continue to the payment step.
          navigate(
            order.payment_method === 'card'
              ? `/checkout/payment/${order.public_id}`
              : `/checkout/success/${order.public_id}`,
            { replace: true },
          );
        },
        onError: (error) => {
          const blocker = getCheckoutBlocker(error);
          bounceToCart(
            blocker ?? 'We could not place your order. Please review your cart and try again.',
          );
        },
      },
    );
  };

  // Profile pre-fills the form (M6-F5-T2); wait briefly so defaults apply.
  const profile = profileQuery.data;
  const formInitialValues: DeliveryFormValues | undefined =
    details ??
    (profile
      ? {
          ...emptyDeliveryValues,
          recipient_name: profile.display_name,
          recipient_phone: profile.preferred_contact_phone,
          delivery_notes: profile.default_delivery_notes,
        }
      : undefined);

  if (cartQuery.isPending || profileQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  // Guard: checkout requires a non-empty cart (covers load errors too).
  if (!cartQuery.data || cartQuery.data.items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-2xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <StepIndicator step={step} />
      </header>

      {step === 'details' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Where should we deliver?</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryDetailsForm
              initialValues={formInitialValues}
              onSubmit={handleDetailsSubmit}
              isSubmitting={prepare.isPending}
            />
          </CardContent>
        </Card>
      )}

      {step === 'review' && summary && details && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Your order from {summary.merchant.display_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.quantity} × {item.product.display_name}
                  </span>
                  <span className="font-medium">{formatPrice(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(summary.item_subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery fee</span>
                  <span>{formatPrice(summary.delivery_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>{formatPrice(summary.service_fee)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-1">
                  <span>Total</span>
                  <span>{formatPrice(summary.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivering to</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">
                {details.recipient_name} · {details.recipient_phone}
              </p>
              <p className="text-muted-foreground">
                {details.delivery_address_line_1}
                {details.delivery_address_line_2 && `, ${details.delivery_address_line_2}`}
              </p>
              <p className="text-muted-foreground">
                {details.delivery_city}
                {details.delivery_state && `, ${details.delivery_state}`}{' '}
                {details.delivery_postal_code}, {details.delivery_country}
              </p>
              {details.delivery_notes && (
                <p className="text-muted-foreground italic">{details.delivery_notes}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentMethodSelector
                methods={summary.allowed_payment_methods}
                value={paymentMethod}
                onChange={setPaymentMethod}
                totalAmount={summary.total_amount}
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={confirm.isPending}
              onClick={() => setStep('details')}
            >
              Edit details
            </Button>
            <Button
              className="flex-1 bg-brand hover:bg-brand-hover text-white"
              disabled={confirm.isPending}
              onClick={handleConfirm}
            >
              {confirm.isPending
                ? 'Placing order…'
                : paymentMethod === 'card'
                  ? 'Continue to payment'
                  : 'Place order'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
