import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import type { AuthResponse, User } from '@/api/types';
import { SUPPRESS_ERROR_TOAST } from '@/lib/toastErrors';
import { SESSION_EXPIRED_EVENT, tokenStorage } from '@/lib/tokenStorage';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while a persisted session is being rehydrated via GET /me. */
  isLoading: boolean;
  /** Store tokens and user after a successful login or signup. */
  setSession: (auth: AuthResponse) => void;
  /** Client-side logout: clears tokens and all cached data. */
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState(() => tokenStorage.hasSession());

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    enabled: hasSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
    meta: SUPPRESS_ERROR_TOAST,
  });

  const endSession = useCallback(() => {
    tokenStorage.clearTokens();
    setHasSession(false);
    queryClient.clear();
  }, [queryClient]);

  // The HTTP client emits this when a refresh attempt fails.
  useEffect(() => {
    const onExpired = () => {
      setHasSession(false);
      queryClient.clear();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  // A /me failure that survived the refresh flow means the session is unusable.
  useEffect(() => {
    if (hasSession && meQuery.isError) {
      endSession();
    }
  }, [hasSession, meQuery.isError, endSession]);

  const setSession = useCallback(
    (auth: AuthResponse) => {
      tokenStorage.setTokens(auth.access, auth.refresh);
      queryClient.setQueryData(['me'], auth.user);
      setHasSession(true);
    },
    [queryClient],
  );

  const user = hasSession ? (meQuery.data ?? null) : null;

  const value: AuthContextValue = {
    user,
    isAuthenticated: user !== null,
    isLoading: hasSession && meQuery.isPending,
    setSession,
    logout: endSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
