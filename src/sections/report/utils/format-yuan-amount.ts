/** Format a backend amount expressed in yuan without changing its unit semantics. */
export function formatYuanAmount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-';

  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}亿`;
  if (absoluteValue >= 10_000) return `${(value / 10_000).toFixed(2)}万`;

  return `${value.toFixed(2)}元`;
}
