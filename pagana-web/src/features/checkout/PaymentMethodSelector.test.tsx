import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PaymentMethodSelector } from './PaymentMethodSelector';

describe('PaymentMethodSelector', () => {
  it('renders only the methods allowed by the API', () => {
    render(
      <PaymentMethodSelector
        methods={['cash_on_delivery']}
        value="cash_on_delivery"
        onChange={() => {}}
        totalAmount={498}
      />,
    );

    expect(screen.getByRole('radio', { name: /cash on delivery/i })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /card/i })).not.toBeInTheDocument();
  });

  it('renders both methods and reports selection changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PaymentMethodSelector
        methods={['cash_on_delivery', 'card']}
        value="cash_on_delivery"
        onChange={onChange}
        totalAmount={498}
      />,
    );

    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await user.click(screen.getByRole('radio', { name: /card/i }));
    expect(onChange).toHaveBeenCalledWith('card');
  });
});
