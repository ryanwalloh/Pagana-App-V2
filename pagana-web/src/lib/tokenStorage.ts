/**
 * Single owner of auth token persistence.
 * No other module may read or write these storage keys directly.
 */

const ACCESS_KEY = 'pagana.access';
const REFRESH_KEY = 'pagana.refresh';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },

  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },

  setTokens(access: string, refresh?: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },

  hasSession(): boolean {
    return this.getRefresh() !== null;
  },
};

/** Window event emitted when the session can no longer be refreshed. */
export const SESSION_EXPIRED_EVENT = 'pagana:session-expired';

export function emitSessionExpired(): void {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
