import { isAxiosError } from 'axios';

import type { ApiFieldErrors } from '@/api/types';

export interface NormalizedApiError {
  /** HTTP status, or undefined for network-level failures. */
  status?: number;
  /** Human-readable message safe to show users. */
  message: string;
  /** DRF per-field validation errors, when present. */
  fieldErrors?: ApiFieldErrors;
}

const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'Cannot reach the server. Check your connection and try again.';
const THROTTLE_MESSAGE = 'Too many requests. Please wait a moment and try again.';

function isFieldErrorPayload(data: unknown): data is ApiFieldErrors {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false;
  }
  return Object.values(data).every(
    (value) =>
      Array.isArray(value) && value.every((item) => typeof item === 'string'),
  );
}

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (!isAxiosError(error)) {
    return { message: GENERIC_MESSAGE };
  }

  if (!error.response) {
    return { message: NETWORK_MESSAGE };
  }

  const { status, data } = error.response;

  if (status === 429) {
    return { status, message: THROTTLE_MESSAGE };
  }

  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') {
      return { status, message: detail };
    }
  }

  if (isFieldErrorPayload(data)) {
    return {
      status,
      message: 'Please correct the highlighted fields.',
      fieldErrors: data,
    };
  }

  return { status, message: GENERIC_MESSAGE };
}
