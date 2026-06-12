import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { TRACKING_POLL_INTERVAL_MS, trackingRefetchInterval } from '@/api/orders';
import {
  FULFILLMENT_LABELS,
  FULFILLMENT_STEPS,
  type FulfillmentStatus,
} from '@/lib/orderStatus';
import { OrderTimeline } from './OrderTimeline';
import { TrackingStepper } from './TrackingStepper';

describe('TrackingStepper', () => {
  it.each(FULFILLMENT_STEPS)('marks %s as the current step', (status) => {
    render(<TrackingStepper status={status} />);

    const current = screen.getByText(FULFILLMENT_LABELS[status], {
      selector: 'span',
    });
    expect(current).toHaveClass('font-semibold');

    // Every happy-path label is always visible on the stepper.
    expect(screen.getAllByRole('listitem')).toHaveLength(FULFILLMENT_STEPS.length);
  });

  it('renders a terminal banner instead of the stepper for cancelled orders', () => {
    render(<TrackingStepper status="cancelled" />);

    expect(screen.getByRole('status')).toHaveTextContent(/order cancelled/i);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('trackingRefetchInterval', () => {
  it('polls while the order is in a non-terminal state', () => {
    const active: FulfillmentStatus[] = [
      'pending',
      'accepted',
      'preparing',
      'ready_for_pickup',
      'assigned_to_rider',
      'in_transit',
      'arrived',
    ];
    for (const status of active) {
      expect(trackingRefetchInterval(status)).toBe(TRACKING_POLL_INTERVAL_MS);
    }
  });

  it('polls before the first response arrives', () => {
    expect(trackingRefetchInterval(undefined)).toBe(TRACKING_POLL_INTERVAL_MS);
  });

  it('stops polling at terminal states', () => {
    expect(trackingRefetchInterval('delivered')).toBe(false);
    expect(trackingRefetchInterval('cancelled')).toBe(false);
  });
});

describe('OrderTimeline', () => {
  it('renders events in the order the API provides (oldest first)', () => {
    render(
      <OrderTimeline
        events={[
          {
            event_type: 'order_created',
            message: 'Order created and awaiting merchant confirmation.',
            created_at: '2026-06-12T08:00:00Z',
          },
          {
            event_type: 'order_accepted',
            message: 'Merchant accepted your order.',
            created_at: '2026-06-12T08:05:00Z',
          },
          {
            event_type: 'payment_succeeded',
            message: 'Payment succeeded for this order.',
            created_at: '2026-06-12T08:06:00Z',
          },
        ]}
      />,
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText(/order created/i)).toBeInTheDocument();
    expect(within(items[2]).getByText(/payment succeeded/i)).toBeInTheDocument();
  });

  it('renders an empty state without events', () => {
    render(<OrderTimeline events={[]} />);
    expect(screen.getByText(/no updates yet/i)).toBeInTheDocument();
  });
});
