import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { paymentsApi, type OrderPaymentSummary } from '@/api/payments';
import PaymentStatusPage from './PaymentStatusPage';

const mockedGetSummary = vi.spyOn(paymentsApi, 'getSummary');

function summaryWith(status: string): OrderPaymentSummary {
  return {
    order_public_id: 'abc-123',
    payment_method: 'card',
    payment_status: status,
    latest_attempt: null,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/checkout/payment/abc-123/status']}>
        <Routes>
          <Route
            path="/checkout/payment/:publicId/status"
            element={<PaymentStatusPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  mockedGetSummary.mockReset();
});

describe('PaymentStatusPage', () => {
  it('shows success with a confirmation link when payment succeeded', async () => {
    mockedGetSummary.mockResolvedValue(summaryWith('succeeded'));

    renderPage();

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view order confirmation/i }),
    ).toHaveAttribute('href', '/checkout/success/abc-123');
  });

  it('shows a retry path when payment failed', async () => {
    mockedGetSummary.mockResolvedValue(summaryWith('failed'));

    renderPage();

    expect(await screen.findByText(/payment unsuccessful/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /try again/i })).toHaveAttribute(
      'href',
      '/checkout/payment/abc-123',
    );
  });

  it('shows the in-progress state while payment is pending', async () => {
    mockedGetSummary.mockResolvedValue(summaryWith('pending'));

    renderPage();

    expect(await screen.findByText(/confirming your payment/i)).toBeInTheDocument();
  });
});
