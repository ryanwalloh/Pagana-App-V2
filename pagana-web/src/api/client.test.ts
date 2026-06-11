import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { apiClient } from './client';
import { SESSION_EXPIRED_EVENT, tokenStorage } from '@/lib/tokenStorage';

function unauthorized(config: InternalAxiosRequestConfig): Promise<never> {
  return Promise.reject(
    new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, {}, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config,
      data: { detail: 'Given token not valid for any token type' },
    } as never),
  );
}

function ok(config: InternalAxiosRequestConfig, data: unknown) {
  return Promise.resolve({
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
    data,
  });
}

describe('apiClient refresh-and-retry interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStorage.setTokens('stale-access', 'valid-refresh');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    apiClient.defaults.adapter = undefined;
  });

  it('refreshes once and retries the original request on 401', async () => {
    const refreshSpy = vi
      .spyOn(axios, 'post')
      .mockResolvedValue({ data: { access: 'fresh-access' } });

    apiClient.defaults.adapter = (config) => {
      const auth = new AxiosHeaders(config.headers).get('Authorization');
      if (auth === 'Bearer fresh-access') {
        return ok(config, { result: 'success' });
      }
      return unauthorized(config);
    };

    const response = await apiClient.get('/customer/profile');

    expect(response.data).toEqual({ result: 'success' });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      { refresh: 'valid-refresh' },
      expect.anything(),
    );
    expect(tokenStorage.getAccess()).toBe('fresh-access');
  });

  it('shares a single refresh across concurrent 401s', async () => {
    const refreshSpy = vi.spyOn(axios, 'post').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: { access: 'fresh-access' } }), 20),
        ),
    );

    apiClient.defaults.adapter = (config) => {
      const auth = new AxiosHeaders(config.headers).get('Authorization');
      if (auth === 'Bearer fresh-access') {
        return ok(config, {});
      }
      return unauthorized(config);
    };

    await Promise.all([
      apiClient.get('/cart'),
      apiClient.get('/orders'),
      apiClient.get('/me'),
    ]);

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('clears the session and emits an event when refresh fails', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('refresh rejected'));
    const expiredListener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expiredListener);

    apiClient.defaults.adapter = (config) => unauthorized(config);

    await expect(apiClient.get('/me')).rejects.toThrow();

    expect(tokenStorage.getAccess()).toBeNull();
    expect(tokenStorage.getRefresh()).toBeNull();
    expect(expiredListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(SESSION_EXPIRED_EVENT, expiredListener);
  });

  it('does not attempt refresh for auth endpoints', async () => {
    const refreshSpy = vi.spyOn(axios, 'post');

    apiClient.defaults.adapter = (config) => unauthorized(config);

    await expect(
      apiClient.post('/auth/login', { email: 'a@b.c', password: 'wrong' }),
    ).rejects.toThrow();

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('does not attempt refresh without a stored refresh token', async () => {
    tokenStorage.clearTokens();
    const refreshSpy = vi.spyOn(axios, 'post');

    apiClient.defaults.adapter = (config) => unauthorized(config);

    await expect(apiClient.get('/me')).rejects.toThrow();
    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('retries a request at most once', async () => {
    // Refresh "succeeds" but the API keeps returning 401 (e.g. revoked user).
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { access: 'fresh-access' } });

    let attempts = 0;
    apiClient.defaults.adapter = (config) => {
      attempts += 1;
      return unauthorized(config);
    };

    await expect(apiClient.get('/me')).rejects.toThrow();
    expect(attempts).toBe(2); // original + exactly one retry
  });
});
