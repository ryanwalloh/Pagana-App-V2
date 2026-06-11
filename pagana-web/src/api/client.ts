import axios, { type InternalAxiosRequestConfig } from 'axios';

import {
  emitSessionExpired,
  tokenStorage,
} from '@/lib/tokenStorage';
import type { RefreshResponse } from './types';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

/** Auth endpoints must never trigger the refresh-and-retry flow. */
const AUTH_PATHS = ['/auth/signup', '/auth/login', '/auth/refresh'];

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Single-flight refresh: concurrent 401s share one refresh request
 * instead of each firing their own.
 */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) {
    throw new Error('No refresh token available');
  }

  // Bare axios call: must not pass through apiClient's own interceptors.
  const response = await axios.post<RefreshResponse>(
    `${API_BASE_URL}/auth/refresh`,
    { refresh },
    { headers: { 'Content-Type': 'application/json' } },
  );

  tokenStorage.setTokens(response.data.access);
  return response.data.access;
}

function isAuthPath(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((path) => url.includes(path));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const shouldAttemptRefresh =
      status === 401 &&
      config !== undefined &&
      !config._retried &&
      !isAuthPath(config.url) &&
      tokenStorage.hasSession();

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const newAccess = await refreshPromise;

      config._retried = true;
      config.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(config);
    } catch {
      tokenStorage.clearTokens();
      emitSessionExpired();
      return Promise.reject(error);
    } finally {
      refreshPromise = null;
    }
  },
);

export default apiClient;
