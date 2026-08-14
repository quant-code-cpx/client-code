export const dateToYmd = (value: string): string => value.replace(/-/g, '');

export function parseSeriesInput(raw: string): number[] {
  return raw
    .split(/[\s,\n]+/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map(Number)
    .filter((value) => !Number.isNaN(value));
}

export function normalizeSeries(values: number[]): number[] {
  if (values.length < 2) return values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 0.5);
  return values.map((value) => (value - min) / range);
}
