/**
 * Display formatting for API decimal amounts. DRF serializes model
 * DecimalFields as strings (e.g. "249.00") but computed method fields
 * (e.g. cart subtotals) as numbers, so both are accepted.
 * Currency symbol is a pending product decision (see WBS M5-F5-T1);
 * PHP is the working default and lives only here.
 */
export function formatPrice(amount: string | number): string {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return String(amount);
  }
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
