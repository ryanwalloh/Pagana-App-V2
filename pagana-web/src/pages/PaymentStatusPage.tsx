import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

import { useOrderPaymentSummary, TERMINAL_PAYMENT_STATUSES } from '@/api/payments';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** Stop polling after this long and show the "still processing" state. */
const POLL_TIMEOUT_MS = 60_000;

export default function PaymentStatusPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const [timedOut, setTimedOut] = useState(false);

  const summaryQuery = useOrderPaymentSummary(publicId ?? '', !timedOut);
  const status = summaryQuery.data?.payment_status;
  const isTerminal = !!status && TERMINAL_PAYMENT_STATUSES.includes(status);

  useEffect(() => {
    if (isTerminal) return;
    const timer = setTimeout(() => setTimedOut(true), POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isTerminal]);

  if (!publicId) return null;

  if (summaryQuery.isPending) {
    return (
      <div className="container mx-auto px-4 py-24 max-w-md">
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'succeeded') {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4 max-w-md">
        <CheckCircle2 className="h-14 w-14 mx-auto text-brand" aria-hidden />
        <h1 className="text-2xl font-bold">Payment successful</h1>
        <p className="text-muted-foreground">
          Your payment went through and the restaurant has been notified.
        </p>
        <Button asChild className="bg-brand hover:bg-brand-hover text-white">
          <Link to={`/checkout/success/${publicId}`}>View order confirmation</Link>
        </Button>
      </div>
    );
  }

  if (status === 'failed' || status === 'cancelled') {
    return (
      <div className="container mx-auto px-4 py-24 text-center space-y-4 max-w-md">
        <XCircle className="h-14 w-14 mx-auto text-destructive" aria-hidden />
        <h1 className="text-2xl font-bold">Payment unsuccessful</h1>
        <p className="text-muted-foreground">
          Your card was not charged. You can try again with a different payment method.
        </p>
        <Button asChild className="bg-brand hover:bg-brand-hover text-white">
          <Link to={`/checkout/payment/${publicId}`}>Try again</Link>
        </Button>
      </div>
    );
  }

  // Pending: either still polling, or we gave up waiting (webhook delay).
  return (
    <div className="container mx-auto px-4 py-24 text-center space-y-4 max-w-md">
      <Clock
        className={`h-14 w-14 mx-auto text-muted-foreground ${timedOut ? '' : 'animate-pulse'}`}
        aria-hidden
      />
      <h1 className="text-2xl font-bold">
        {timedOut ? 'Payment is processing' : 'Confirming your payment…'}
      </h1>
      <p className="text-muted-foreground">
        {timedOut
          ? 'This is taking longer than usual. Your order is safe — the status will update automatically once the payment settles.'
          : 'Hang tight, this usually takes a few seconds.'}
      </p>
      {timedOut && (
        <Button asChild variant="outline">
          <Link to={`/orders/${publicId}`}>View your order</Link>
        </Button>
      )}
    </div>
  );
}
