import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError, AxiosHeaders } from 'axios';

import { authApi } from '@/api/auth';
import { cartApi, type Cart } from '@/api/cart';
import type { Product } from '@/api/catalog';
import type { User } from '@/api/types';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { tokenStorage } from '@/lib/tokenStorage';
import { AddToCartControl } from './AddToCartControl';

const mockedMe = vi.spyOn(authApi, 'me');
const mockedGetCart = vi.spyOn(cartApi, 'getCart');
const mockedSetItem = vi.spyOn(cartApi, 'setItem');
const mockedClearCart = vi.spyOn(cartApi, 'clearCart');

const customer: User = {
  id: 1,
  email: 'customer@example.com',
  phone_number: '',
  role: 'customer',
  is_active: true,
  is_email_verified: false,
  is_phone_verified: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const product: Product = {
  id: 10,
  display_name: 'Burger',
  description: 'Classic',
  price: '120.00',
  image_url: '',
  category: null,
  merchant: { id: 2, display_name: 'Bahay Burger' },
};

const emptyCart: Cart = {
  id: 1,
  merchant: null,
  items: [],
  subtotal: 0,
  total_quantity: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const otherMerchantCart: Cart = {
  ...emptyCart,
  merchant: { id: 5, display_name: 'Kusina ni Aling Nena' },
  items: [
    {
      id: 50,
      product: { id: 99, display_name: 'Adobo', description: '', image_url: '' },
      quantity: 1,
      unit_price: '150.00',
      subtotal: 150,
    },
  ],
  subtotal: 150,
  total_quantity: 1,
};

function crossMerchantError(): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError(
    'Request failed with status code 400',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 400,
      statusText: 'Bad Request',
      headers,
      config: { headers },
      data: {
        product_id: ['Cart can only contain items from one merchant at a time.'],
      },
    },
  );
}

function renderControl() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter>
          <AddToCartControl product={product} />
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockedMe.mockResolvedValue(customer);
  mockedGetCart.mockResolvedValue(emptyCart);
});

afterEach(() => {
  mockedMe.mockReset();
  mockedGetCart.mockReset();
  mockedSetItem.mockReset();
  mockedClearCart.mockReset();
  tokenStorage.clearTokens();
});

describe('AddToCartControl', () => {
  it('shows a sign-in link for guests', () => {
    renderControl();

    const link = screen.getByRole('link', { name: /sign in to order/i });
    expect(link).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: /add to cart/i })).not.toBeInTheDocument();
  });

  it('sets the chosen quantity for a customer', async () => {
    tokenStorage.setTokens('access', 'refresh');
    mockedSetItem.mockResolvedValue(emptyCart);
    const user = userEvent.setup();

    renderControl();

    await user.click(await screen.findByRole('button', { name: /increase quantity/i }));
    await user.click(screen.getByRole('button', { name: /add to cart/i }));

    expect(mockedSetItem).toHaveBeenCalledWith(product.id, 2);
  });

  it('offers to clear the cart on a cross-merchant conflict, then retries', async () => {
    tokenStorage.setTokens('access', 'refresh');
    mockedGetCart.mockResolvedValue(otherMerchantCart);
    mockedSetItem
      .mockRejectedValueOnce(crossMerchantError())
      .mockResolvedValueOnce(emptyCart);
    mockedClearCart.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderControl();

    await user.click(await screen.findByRole('button', { name: /add to cart/i }));

    expect(await screen.findByText(/start a new cart\?/i)).toBeInTheDocument();
    expect(screen.getByText(/kusina ni aling nena/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear and add/i }));

    expect(mockedClearCart).toHaveBeenCalledTimes(1);
    expect(mockedSetItem).toHaveBeenCalledTimes(2);
  });
});
