import { yuanToYi } from './utils';

export function signedScatterPercent(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return '—';
  return `${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(2)}%`;
}

export function signedScatterYi(value: number | null | undefined): string {
  if (!Number.isFinite(value)) return '—';
  const yiValue = yuanToYi(value);
  return `${yiValue >= 0 ? '+' : ''}${yiValue.toFixed(2)}亿`;
}

export function scatterFlowColor(
  value: number | null
): 'error.main' | 'success.main' | 'text.secondary' {
  if (value == null || !Number.isFinite(value)) return 'text.secondary';
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

export function scatterPercentColor(
  value: number | null
): 'error.main' | 'success.main' | 'text.secondary' {
  if (value == null || !Number.isFinite(value)) return 'text.secondary';
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}
