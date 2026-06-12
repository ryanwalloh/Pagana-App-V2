import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ErrorBoundary } from './ErrorBoundary';

function Thrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('boom');
  }
  return <p>All good</p>;
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Thrower shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('shows a recovery screen when a child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Thrower shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
