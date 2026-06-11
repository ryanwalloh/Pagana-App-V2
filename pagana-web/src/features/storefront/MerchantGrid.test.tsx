import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { catalogApi } from '@/api/catalog';
import { MerchantGrid } from './MerchantGrid';

// Spy on the real object: the query hooks close over `catalogApi` itself,
// so replacing the module export would not intercept their calls.
const mockedList = vi.spyOn(catalogApi, 'listMerchants');

function renderGrid() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MerchantGrid />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  mockedList.mockReset();
});

describe('MerchantGrid', () => {
  it('renders merchant cards linking to storefronts', async () => {
    mockedList.mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 1, display_name: 'Kusina ni Aling Nena', storefront_image_url: '', city: 'Marawi' },
        { id: 2, display_name: 'Bahay Burger', storefront_image_url: '', city: 'Iligan' },
      ],
    });

    renderGrid();

    expect(await screen.findByText('Kusina ni Aling Nena')).toBeInTheDocument();
    expect(screen.getByText('Bahay Burger')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/merchants/1');
  });

  it('renders an empty state when no merchants are open', async () => {
    mockedList.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });

    renderGrid();

    expect(
      await screen.findByText(/no restaurants are open right now/i),
    ).toBeInTheDocument();
  });

  it('renders an error state with retry', async () => {
    mockedList.mockRejectedValue(new Error('network down'));

    renderGrid();

    expect(
      await screen.findByText(/couldn't load restaurants/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
