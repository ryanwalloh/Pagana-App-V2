/**
 * Idempotency-key lifecycle for checkout confirm (WBS M4-F4-T1).
 *
 * One key is generated when checkout starts and reused for every confirm
 * attempt, so a retry after a network timeout cannot create a second order
 * (the server dedupes on customer + key). The key rotates only after a
 * confirmed success, or when the cart contents change.
 */

const STORAGE_KEY = 'pagana.checkout.idempotency';

interface StoredKey {
  key: string;
  /** Fingerprint of the cart the key was issued for. */
  cartSignature: string;
}

function readStored(): StoredKey | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredKey;
    return typeof parsed.key === 'string' && typeof parsed.cartSignature === 'string'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** Stable fingerprint of cart contents: item ids and quantities. */
export function cartSignature(items: Array<{ id: number; quantity: number }>): string {
  return items
    .map((item) => `${item.id}x${item.quantity}`)
    .sort()
    .join(',');
}

/**
 * Return the active idempotency key for this cart state, minting a new one
 * if none exists or the cart changed since the key was issued.
 */
export function getIdempotencyKey(signature: string): string {
  const stored = readStored();
  if (stored && stored.cartSignature === signature) {
    return stored.key;
  }
  const fresh: StoredKey = { key: crypto.randomUUID(), cartSignature: signature };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh.key;
}

/** Discard the key after a confirmed success so the next order gets its own. */
export function clearIdempotencyKey(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
