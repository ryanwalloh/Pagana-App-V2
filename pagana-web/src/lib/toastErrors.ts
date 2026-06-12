import { toast } from 'sonner';

import { normalizeApiError } from './apiError';

/** Show a user-safe toast for an API or network failure. */
export function showApiErrorToast(error: unknown, fallback?: string): void {
  const { message } = normalizeApiError(error);
  toast.error(fallback ?? message);
}

/** TanStack Query/Mutation meta: set to skip the global error toast. */
export const SUPPRESS_ERROR_TOAST = { suppressErrorToast: true } as const;
