import { fDateTime } from './format-time';
import { fNumber, fCurrency } from './format-number';

// ----------------------------------------------------------------------

export type PortfolioValueTone = 'success.main' | 'error.main' | 'text.secondary';

function toFiniteNumber(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value);
}

export function getPortfolioValueTone(value: number | null | undefined): PortfolioValueTone {
  const number = toFiniteNumber(value);
  if (number == null || number === 0) return 'text.secondary';
  return number > 0 ? 'error.main' : 'success.main';
}

export function fSignedCurrency(value: number | null | undefined, fallback = '非交易日'): string {
  const number = toFiniteNumber(value);
  if (number == null) return fallback;
  if (number === 0) return fCurrency(0);
  return number > 0 ? `+${fCurrency(number)}` : fCurrency(number);
}

export function fNullableCurrency(value: number | null | undefined, fallback = '--'): string {
  const number = toFiniteNumber(value);
  if (number == null) return fallback;
  return fCurrency(number);
}

export function fSignedRatio(value: number | null | undefined, fallback = '非交易日'): string {
  const number = toFiniteNumber(value);
  if (number == null) return fallback;
  const percent = number * 100;
  const sign = percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

export function fNullableRatio(value: number | null | undefined, fallback = '--'): string {
  const number = toFiniteNumber(value);
  if (number == null) return fallback;
  return `${(number * 100).toFixed(2)}%`;
}

export function fPortfolioQuantity(value: number | null | undefined): string {
  const number = toFiniteNumber(value);
  if (number == null) return '--';
  return fNumber(number, { maximumFractionDigits: 0 });
}

export function fPortfolioUpdatedAt(value: string | null | undefined): string {
  if (!value) return '暂无更新时间';
  const formatted = fDateTime(value, 'YYYY-MM-DD HH:mm');
  return formatted === '—' ? '暂无更新时间' : formatted;
}
