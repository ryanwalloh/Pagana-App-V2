import { normalizeApiError } from '@/lib/apiError';

/**
 * Checkout-blocking 400s (WBS M4-F4-T3): the cart was emptied or changed in
 * another tab, a product became unorderable, or the merchant went offline.
 * These can't be fixed on the checkout form — the user must return to the
 * cart. Returns the user-facing message, or null for ordinary field errors.
 */
const BLOCKER_FIELDS = ['cart', 'merchant', 'product_id'] as const;

export function getCheckoutBlocker(error: unknown): string | null {
  const normalized = normalizeApiError(error);
  if (normalized.status !== 400 || !normalized.fieldErrors) {
    return null;
  }
  for (const field of BLOCKER_FIELDS) {
    const messages = normalized.fieldErrors[field];
    if (messages?.length) {
      return messages.join(' ');
    }
  }
  return null;
}
