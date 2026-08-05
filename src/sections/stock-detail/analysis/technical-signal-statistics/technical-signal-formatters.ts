import type {
  TechnicalSignalPeriod,
  SignalPeriodStatistics,
  SignalHorizonStatistics,
  TechnicalSignalDirection,
} from 'src/api/technical-signal';

import { fmtTradeDate } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export const DEFAULT_SIGNAL_PERIOD: TechnicalSignalPeriod = '3Y';

export const DEFAULT_SIGNAL_HORIZONS = [1, 3, 5, 10, 20];

export const PERIOD_LABELS: Record<TechnicalSignalPeriod, string> = {
  '1Y': '近 1 年',
  '3Y': '近 3 年',
  CUSTOM: '自定义区间',
};

export const DIRECTION_LABELS: Record<TechnicalSignalDirection, string> = {
  BULLISH: '多头',
  BEARISH: '空头',
  CONTEXTUAL: '情境',
};

export function formatTradeDate(value: string | null | undefined): string {
  return value ? fmtTradeDate(value, 'YYYY-MM-DD') : '—';
}

export function toCompactTradeDate(value: string): string {
  return value.replace(/-/g, '');
}

export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('zh-CN').format(value);
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(digits)}%`;
}

export function formatRatio(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? '—' : value.toFixed(digits);
}

export function formatConfidenceInterval(
  lower: number | null | undefined,
  upper: number | null | undefined
): string {
  if (lower === null || lower === undefined || upper === null || upper === undefined) return '—';
  return `${formatPercent(lower)} ～ ${formatPercent(upper)}`;
}

export function formatRatioConfidenceInterval(
  lower: number | null | undefined,
  upper: number | null | undefined
): string {
  if (lower === null || lower === undefined || upper === null || upper === undefined) return '—';
  return `${formatRatio(lower)} ～ ${formatRatio(upper)}`;
}

export function normalizeHorizons(values: number[]): number[] {
  return [...new Set(values.filter((value) => Number.isInteger(value) && value >= 1 && value <= 60))].sort(
    (a, b) => a - b
  );
}

export function findSignalGroup(
  groups: SignalPeriodStatistics[],
  period: TechnicalSignalPeriod,
  signalKey: string | null
): SignalPeriodStatistics | null {
  const periodGroups = groups.filter((group) => group.period === period);
  if (periodGroups.length === 0) return null;
  return periodGroups.find((group) => group.signalKey === signalKey) ?? periodGroups[0];
}

export function findHorizonStatistics(
  group: SignalPeriodStatistics | null,
  horizon: number | null
): SignalHorizonStatistics | null {
  if (!group || group.horizons.length === 0) return null;
  return group.horizons.find((item) => item.horizon === horizon) ?? group.horizons[0];
}

export function primaryMetric(
  direction: TechnicalSignalDirection,
  horizon: SignalHorizonStatistics
): { ratioLabel: string; ratio: number | null; returnLabel: string; returnPct: number | null } {
  if (direction === 'CONTEXTUAL') {
    return {
      ratioLabel: '上涨率',
      ratio: horizon.raw.upRatio,
      returnLabel: '平均收益',
      returnPct: horizon.raw.averageReturnPct,
    };
  }

  return {
    ratioLabel: '方向成功率',
    ratio: horizon.directional.successRatio,
    returnLabel: '平均方向收益',
    returnPct: horizon.directional.averageDirectionalReturnPct,
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
