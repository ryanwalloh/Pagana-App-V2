/**
 * Shared API types mirroring pagana-api serializers.
 * Field names and shapes are verified against the backend source —
 * do not add fields the API does not return.
 */

export type UserRole = 'customer' | 'merchant' | 'rider' | 'admin';

export interface User {
  id: number;
  email: string;
  phone_number: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  created_at: string;
  updated_at: string;
}

/** Unified response shape of POST /auth/signup and POST /auth/login. */
export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

/** Response shape of POST /auth/refresh (no rotation configured). */
export interface RefreshResponse {
  access: string;
}

/** DRF PageNumberPagination envelope. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** DRF validation error payload: field name → list of messages. */
export type ApiFieldErrors = Record<string, string[]>;
