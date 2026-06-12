import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { tokenStorage } from '@/lib/tokenStorage';
import type { AuthResponse } from '@/api/types';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';

vi.mock('@/api/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/api/auth')>();
  return {
    ...original,
    authApi: {
      signup: vi.fn(),
      login: vi.fn(),
      me: vi.fn(),
    },
  };
});

import { authApi } from '@/api/auth';

const mockedAuthApi = vi.mocked(authApi);

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

const authResponse: AuthResponse = {
  access: 'access-token',
  refresh: 'refresh-token',
  user: {
    id: 1,
    email: 'tester@pagana.local',
    phone_number: '',
    role: 'customer',
    is_active: true,
    is_email_verified: false,
    is_phone_verified: false,
    created_at: '2026-06-11T00:00:00Z',
    updated_at: '2026-06-11T00:00:00Z',
  },
};

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('shows a client-side validation error for an invalid email', async () => {
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(mockedAuthApi.login).not.toHaveBeenCalled();
  });

  it('shows a credentials error on 401', async () => {
    mockedAuthApi.login.mockRejectedValue(
      makeAxiosError(401, { detail: 'No active account found' }),
    );
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/incorrect email or password/i),
    ).toBeInTheDocument();
  });

  it('shows a throttle message on 429', async () => {
    mockedAuthApi.login.mockRejectedValue(
      makeAxiosError(429, { detail: 'Request was throttled.' }),
    );
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument();
  });

  it('stores tokens on successful login', async () => {
    mockedAuthApi.login.mockResolvedValue(authResponse);
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'tester@pagana.local' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'StrongPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await vi.waitFor(() => {
      expect(tokenStorage.getAccess()).toBe('access-token');
      expect(tokenStorage.getRefresh()).toBe('refresh-token');
    });
  });
});

describe('RegisterPage', () => {
  it('rejects passwords shorter than 8 characters client-side', async () => {
    renderWithProviders(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'new@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/at least 8 characters\./i),
    ).toBeInTheDocument();
    expect(mockedAuthApi.signup).not.toHaveBeenCalled();
  });

  it('maps a duplicate-email server error onto the email field', async () => {
    mockedAuthApi.signup.mockRejectedValue(
      makeAxiosError(400, { email: ['user with this email already exists.'] }),
    );
    renderWithProviders(<RegisterPage />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'taken@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'StrongPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/already exists/i),
    ).toBeInTheDocument();
  });
});
