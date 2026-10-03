export function formatTZS(
  amount: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat('en-TZ', {
    ...options,
    style: 'currency',
    currency: 'TZS',
  }).format(amount);
}
