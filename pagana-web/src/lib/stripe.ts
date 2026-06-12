import type { Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Lazy singleton: Stripe JS is only downloaded when the payment step
 * actually mounts, keeping it out of the main bundle.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = import('@stripe/stripe-js').then(({ loadStripe }) =>
      loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY),
    );
  }
  return stripePromise;
}
