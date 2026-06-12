import { Check, XCircle } from 'lucide-react';

import {
  FULFILLMENT_LABELS,
  FULFILLMENT_STEPS,
  fulfillmentStepIndex,
  type FulfillmentStatus,
} from '@/lib/orderStatus';

/**
 * Horizontal stepper over the fulfillment happy path. Cancelled orders render
 * a distinct terminal banner instead of a position on the path.
 */
export function TrackingStepper({ status }: { status: FulfillmentStatus }) {
  if (status === 'cancelled') {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4"
      >
        <XCircle className="h-6 w-6 text-destructive shrink-0" aria-hidden />
        <div>
          <p className="font-medium text-destructive">Order cancelled</p>
          <p className="text-sm text-muted-foreground">
            This order will not be delivered. If you were charged, the payment will be refunded.
          </p>
        </div>
      </div>
    );
  }

  const activeIndex = fulfillmentStepIndex(status);

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <ol className="flex min-w-[640px] items-start px-1" aria-label="Order progress">
      {FULFILLMENT_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li key={step} className="flex-1 flex flex-col items-center min-w-0">
            <div className="flex items-center w-full">
              <div
                className={`h-0.5 flex-1 ${index === 0 ? 'invisible' : ''} ${
                  index <= activeIndex ? 'bg-brand' : 'bg-border'
                }`}
              />
              <div
                aria-current={isActive ? 'step' : undefined}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isDone || isActive
                    ? 'bg-brand text-white'
                    : 'bg-muted text-muted-foreground'
                } ${isActive ? 'ring-4 ring-brand/20' : ''}`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" aria-hidden /> : index + 1}
              </div>
              <div
                className={`h-0.5 flex-1 ${
                  index === FULFILLMENT_STEPS.length - 1 ? 'invisible' : ''
                } ${index < activeIndex ? 'bg-brand' : 'bg-border'}`}
              />
            </div>
            <span
              className={`mt-1.5 px-0.5 text-center text-[10px] sm:text-xs leading-tight ${
                isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }`}
            >
              {FULFILLMENT_LABELS[step]}
            </span>
          </li>
        );
      })}
      </ol>
    </div>
  );
}
