import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';

import { normalizeApiError } from './apiError';

function makeAxiosError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, {}, {
    status,
    statusText: 'Error',
    headers: {},
    config,
    data,
  } as never);
}

describe('normalizeApiError', () => {
  it('returns a network message when there is no response', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', {
      headers: new AxiosHeaders(),
    });
    const result = normalizeApiError(error);
    expect(result.status).toBeUndefined();
    expect(result.message).toMatch(/cannot reach the server/i);
  });

  it('returns a throttle message for 429 responses', () => {
    const result = normalizeApiError(makeAxiosError(429, { detail: 'Throttled' }));
    expect(result.status).toBe(429);
    expect(result.message).toMatch(/too many requests/i);
  });

  it('uses the DRF detail string when present', () => {
    const result = normalizeApiError(
      makeAxiosError(401, { detail: 'No active account found.' }),
    );
    expect(result.message).toBe('No active account found.');
  });

  it('extracts DRF field errors', () => {
    const result = normalizeApiError(
      makeAxiosError(400, {
        email: ['user with this email already exists.'],
        password: ['This password is too short.'],
      }),
    );
    expect(result.fieldErrors).toEqual({
      email: ['user with this email already exists.'],
      password: ['This password is too short.'],
    });
  });

  it('falls back to a generic message for unknown payloads', () => {
    const result = normalizeApiError(makeAxiosError(500, '<html>oops</html>'));
    expect(result.message).toMatch(/something went wrong/i);
  });

  it('handles non-axios errors', () => {
    const result = normalizeApiError(new Error('boom'));
    expect(result.message).toMatch(/something went wrong/i);
  });
});
