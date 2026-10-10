export function formatTsh(
  amount: number,
  options: Intl.NumberFormatOptions = {},
): string {
  return `Tsh ${new Intl.NumberFormat('en-TZ', {
    ...options,
    minimumFractionDigits: options.minimumFractionDigits ?? (options.maximumFractionDigits === 0 ? 0 : 2),
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    style: 'decimal',
  }).format(amount)}`;
}
