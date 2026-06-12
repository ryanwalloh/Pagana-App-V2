import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';

import { useCreatePaymentIntent } from '@/api/payments';
import { getStripe } from '@/lib/stripe';
import { normalizeApiError } from '@/lib/apiError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function PaymentForm({ orderPublicId }: { orderPublicId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setErrorMessage(null);

    // redirect: 'if_required' keeps card flows on-page; 3DS opens Stripe's
    // modal. Redirect-based methods would return here via return_url.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/payment/${orderPublicId}/status`,
      },
      redirect: 'if_required',
    });

    if (error) {
      // Declines and validation problems are retryable — the order stays payable.
      setErrorMessage(error.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
      return;
    }

    // Confirmed (or processing) — the webhook decides the final state; the
    // status screen polls until it lands.
    navigate(`/checkout/payment/${orderPublicId}/status`, { replace: true });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {errorMessage}
        </p>
      )}
      <Button
        type="submit"
        className="w-full bg-brand hover:bg-brand-hover text-white"
        disabled={!stripe || !elements || submitting}
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </Button>
    </form>
  );
}

export default function PaymentPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();
  const createIntent = useCreatePaymentIntent();
  const [stripePromise] = useState<Promise<Stripe | null>>(getStripe);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const { mutate: createIntentMutate } = createIntent;

  useEffect(() => {
    if (!publicId) return;
    // Idempotent server-side — remounts reuse the existing intent.
    createIntentMutate(publicId, {
      onSuccess: (attempt) => {
        if (attempt.status === 'succeeded') {
          navigate(`/checkout/payment/${publicId}/status`, { replace: true });
          return;
        }
        setClientSecret(attempt.provider_client_secret);
      },
      onError: (error) => {
        setSetupError(normalizeApiError(error).message);
      },
    });
  }, [publicId, createIntentMutate, navigate]);

  if (!publicId) {
    return null;
  }

  if (setupError) {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4">
        <p className="text-muted-foreground">{setupError}</p>
        <Button asChild variant="outline">
          <Link to={`/orders/${publicId}`}>View order</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Pay for your order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order <span className="font-mono">{publicId}</span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Card details</CardTitle>
        </CardHeader>
        <CardContent>
          {clientSecret ? (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'stripe' } }}
            >
              <PaymentForm orderPublicId={publicId} />
            </Elements>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Payments are processed securely by Stripe. Your card details never touch our servers.
      </p>
    </div>
  );
}
