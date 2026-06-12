import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import type { NormalizedApiError } from './apiError';

/**
 * Map DRF field errors from a normalized API error onto react-hook-form fields.
 * Errors for unknown fields are collected onto the given root key so they can
 * be rendered as a form-level message instead of being silently dropped.
 */
export function applyServerErrors<T extends FieldValues>(
  error: NormalizedApiError,
  setError: UseFormSetError<T>,
  knownFields: Array<Path<T>>,
): void {
  if (!error.fieldErrors) {
    setError('root.serverError' as Path<T>, {
      type: 'server',
      message: error.message,
    });
    return;
  }

  const unknownMessages: string[] = [];

  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    const message = messages.join(' ');
    if ((knownFields as string[]).includes(field)) {
      setError(field as Path<T>, { type: 'server', message });
    } else {
      unknownMessages.push(message);
    }
  }

  if (unknownMessages.length > 0) {
    setError('root.serverError' as Path<T>, {
      type: 'server',
      message: unknownMessages.join(' '),
    });
  }
}
