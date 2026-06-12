import { afterEach, describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

import { getCheckoutBlocker } from './checkoutErrors';
import {
  cartSignature,
  clearIdempotencyKey,
  getIdempotencyKey,
} from './idempotency';
import { deliverySchema, emptyDeliveryValues } from './deliverySchema';

function apiError400(data: unknown): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 400,
    statusText: 'Bad Request',
    headers,
    config: { headers },
    data,
  });
}

const validDetails = {
  ...emptyDeliveryValues,
  recipient_name: 'Juan dela Cruz',
  recipient_phone: '+63 912 345 6789',
  delivery_address_line_1: '123 Mabini St',
  delivery_city: 'Marawi',
  delivery_postal_code: '9700',
};

describe('deliverySchema', () => {
  it('accepts a complete valid payload', () => {
    expect(deliverySchema.safeParse(validDetails).success).toBe(true);
  });

  it('requires the mandatory fields', () => {
    const result = deliverySchema.safeParse(emptyDeliveryValues);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => issue.path[0]);
      expect(fields).toContain('recipient_name');
      expect(fields).toContain('recipient_phone');
      expect(fields).toContain('delivery_address_line_1');
      expect(fields).toContain('delivery_city');
      expect(fields).toContain('delivery_postal_code');
    }
  });

  it('mirrors API max lengths', () => {
    expect(
      deliverySchema.safeParse({
        ...validDetails,
        recipient_name: 'x'.repeat(256),
      }).success,
    ).toBe(false);
    expect(
      deliverySchema.safeParse({
        ...validDetails,
        recipient_phone: '9'.repeat(33),
      }).success,
    ).toBe(false);
    expect(
      deliverySchema.safeParse({
        ...validDetails,
        delivery_city: 'x'.repeat(121),
      }).success,
    ).toBe(false);
  });

  it('rejects non-ISO-2 country codes', () => {
    expect(
      deliverySchema.safeParse({ ...validDetails, delivery_country: 'PHL' }).success,
    ).toBe(false);
    expect(
      deliverySchema.safeParse({ ...validDetails, delivery_country: 'ph' }).success,
    ).toBe(false);
  });

  it('rejects malformed phone numbers', () => {
    expect(
      deliverySchema.safeParse({ ...validDetails, recipient_phone: 'call me' }).success,
    ).toBe(false);
  });
});

describe('idempotency key lifecycle', () => {
  afterEach(() => {
    clearIdempotencyKey();
  });

  it('reuses the same key for an unchanged cart', () => {
    const signature = cartSignature([{ id: 1, quantity: 2 }]);
    const first = getIdempotencyKey(signature);
    const second = getIdempotencyKey(signature);
    expect(second).toBe(first);
  });

  it('mints a new key when the cart changes', () => {
    const first = getIdempotencyKey(cartSignature([{ id: 1, quantity: 2 }]));
    const second = getIdempotencyKey(cartSignature([{ id: 1, quantity: 3 }]));
    expect(second).not.toBe(first);
  });

  it('mints a new key after an explicit clear (post-success rotation)', () => {
    const signature = cartSignature([{ id: 1, quantity: 2 }]);
    const first = getIdempotencyKey(signature);
    clearIdempotencyKey();
    const second = getIdempotencyKey(signature);
    expect(second).not.toBe(first);
  });

  it('produces order-insensitive cart signatures', () => {
    expect(
      cartSignature([
        { id: 2, quantity: 1 },
        { id: 1, quantity: 4 },
      ]),
    ).toBe(
      cartSignature([
        { id: 1, quantity: 4 },
        { id: 2, quantity: 1 },
      ]),
    );
  });
});

describe('getCheckoutBlocker', () => {
  it('detects cart-level blockers', () => {
    expect(getCheckoutBlocker(apiError400({ cart: ['Cart is empty.'] }))).toBe(
      'Cart is empty.',
    );
  });

  it('detects merchant-offline blockers', () => {
    expect(
      getCheckoutBlocker(
        apiError400({ merchant: ['Merchant is not currently accepting orders.'] }),
      ),
    ).toBe('Merchant is not currently accepting orders.');
  });

  it('detects unorderable-product blockers', () => {
    expect(
      getCheckoutBlocker(
        apiError400({ product_id: ['Product 7 is not currently orderable.'] }),
      ),
    ).toBe('Product 7 is not currently orderable.');
  });

  it('returns null for ordinary form field errors', () => {
    expect(
      getCheckoutBlocker(apiError400({ recipient_phone: ['This field is required.'] })),
    ).toBeNull();
  });

  it('returns null for non-400 errors', () => {
    expect(getCheckoutBlocker(new Error('network down'))).toBeNull();
  });
});
