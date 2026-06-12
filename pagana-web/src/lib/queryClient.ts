import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { normalizeApiError } from './apiError';
import { showApiErrorToast } from './toastErrors';

function shouldSuppressToast(meta: Record<string, unknown> | undefined): boolean {
  return meta?.suppressErrorToast === true;
}

/**
 * Shared QueryClient with global error toasts for failures that are not
 * handled inline. Queries/mutations that render their own error UI pass
 * meta: SUPPRESS_ERROR_TOAST.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (shouldSuppressToast(query.meta)) return;
      showApiErrorToast(error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (shouldSuppressToast(mutation.meta)) return;
      showApiErrorToast(error);
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export { normalizeApiError };
