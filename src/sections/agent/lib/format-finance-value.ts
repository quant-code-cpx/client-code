import type { ValueScale } from 'src/types/agent/generated';

export type FinanceFormatSpec = {
  unit?: string;
  currency?: string;
  scale?: ValueScale;
  precision?: number;
  nullLabel?: string;
};

const FINANCE_NUMBER = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 4,
  minimumFractionDigits: 0,
});

export function formatFinanceValue(
  value: number | null | undefined,
  spec: FinanceFormatSpec = {}
): string {
  if (value == null || !Number.isFinite(value)) return spec.nullLabel ?? '—';

  const precision = Math.min(Math.max(spec.precision ?? 2, 0), 6);
  if (spec.scale) {
    const percent = spec.scale === 'DECIMAL' ? value * 100 : value;
    return `${new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    }).format(percent)}%`;
  }

  const formatted =
    spec.precision === undefined
      ? FINANCE_NUMBER.format(value)
      : new Intl.NumberFormat('zh-CN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: precision,
        }).format(value);

  if (spec.unit) return `${formatted} ${spec.unit}`;
  if (spec.currency) return `${formatted} ${spec.currency}`;
  return formatted;
}

export function escapeCsvFormula(value: string): string {
  return /^[\s\t]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function toCsvCell(value: string | number | boolean | null): string {
  const text = escapeCsvFormula(value == null ? '' : String(value));
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
