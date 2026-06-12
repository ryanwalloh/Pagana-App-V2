import type { PaymentMethod } from '@/api/orders';
import { formatPrice } from '@/lib/currency';

const LABELS: Record<PaymentMethod, string> = {
  cash_on_delivery: 'Cash on Delivery',
  card: 'Card',
};

/** Options come from the API's allowed_payment_methods — never hardcoded. */
export function PaymentMethodSelector({
  methods,
  value,
  onChange,
  totalAmount,
}: {
  methods: PaymentMethod[];
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  totalAmount: number;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Payment method</legend>
      {methods.map((method) => (
        <label
          key={method}
          className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
            value === method
              ? 'border-brand bg-brand/5'
              : 'border-border hover:border-muted-foreground/40'
          }`}
        >
          <input
            type="radio"
            name="payment_method"
            value={method}
            checked={value === method}
            onChange={() => onChange(method)}
            className="mt-1"
          />
          <span className="text-sm">
            <span className="font-medium block">{LABELS[method]}</span>
            <span className="text-muted-foreground">
              {method === 'cash_on_delivery'
                ? `Pay the rider ${formatPrice(totalAmount)} when your order arrives.`
                : 'Pay securely online with a credit or debit card.'}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
