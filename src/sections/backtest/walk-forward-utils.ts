import type { WalkForwardWindow, WalkForwardRunDetail } from 'src/api/backtest';

// ----------------------------------------------------------------------

export type RobustnessLevel = 'GREEN' | 'YELLOW' | 'RED';

export type RobustnessStats = {
  wfe: number | null;
  wfeEstimated: boolean;
  negativeWindowCount: number;
  negativeWindowRate: number | null;
  degradation: number | null;
  level: RobustnessLevel;
};

export type WindowPreviewItem = {
  windowIndex: number;
  isStartDate: string;
  isEndDate: string;
  oosStartDate: string;
  oosEndDate: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatCompactDate(value: string | null | undefined): string {
  if (!value) return '—';
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

export function toCompactDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function parseAnyDate(value: string): Date | null {
  if (!value) return null;
  const normalized = /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value;
  const date = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * DAY_MS);
}

function diffDays(left: Date, right: Date): number {
  return Math.floor((right.getTime() - left.getTime()) / DAY_MS);
}

export function generateWalkForwardWindowPreview(query: {
  fullStartDate: string;
  fullEndDate: string;
  inSampleDays: number;
  outOfSampleDays: number;
  stepDays: number;
  purgeDays?: number;
  embargoDays?: number;
}): WindowPreviewItem[] {
  const start = parseAnyDate(query.fullStartDate);
  const end = parseAnyDate(query.fullEndDate);
  const inSampleDays = Math.max(1, Math.floor(query.inSampleDays));
  const outOfSampleDays = Math.max(1, Math.floor(query.outOfSampleDays));
  const stepDays = Math.max(1, Math.floor(query.stepDays));
  const purgeDays = Math.max(0, Math.floor(query.purgeDays ?? 0));
  const embargoDays = Math.max(0, Math.floor(query.embargoDays ?? 0));

  if (!start || !end || end <= start) return [];

  const windows: WindowPreviewItem[] = [];
  let cursor = start;
  let index = 0;

  while (index < 200) {
    const isStart = cursor;
    const isEnd = addDays(isStart, inSampleDays - 1);
    const oosStart = addDays(isEnd, 1 + purgeDays + embargoDays);
    const oosEnd = addDays(oosStart, outOfSampleDays - 1);

    if (oosEnd > end) break;

    windows.push({
      windowIndex: index,
      isStartDate: toCompactDate(isStart),
      isEndDate: toCompactDate(isEnd),
      oosStartDate: toCompactDate(oosStart),
      oosEndDate: toCompactDate(oosEnd),
    });

    cursor = addDays(cursor, stepDays);
    index += 1;
  }

  return windows;
}

export function estimateCalendarCoverageDays(startDate: string, endDate: string): number | null {
  const start = parseAnyDate(startDate);
  const end = parseAnyDate(endDate);
  if (!start || !end || end < start) return null;
  return diffDays(start, end) + 1;
}

export function getEnabledParamKeys(windows: WalkForwardWindow[]): string[] {
  const keys = new Set<string>();
  windows.forEach((window) => {
    Object.keys(window.optimizedParams ?? {}).forEach((key) => keys.add(key));
  });
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
}

function averageNonNull(values: Array<number | null | undefined>): number | null {
  const nums = values.filter(isFiniteNumber);
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function computeWalkForwardWfe(detail: WalkForwardRunDetail): {
  value: number | null;
  estimated: boolean;
} {
  if (isFiniteNumber(detail.wfe)) return { value: detail.wfe, estimated: false };

  const avgIs = averageNonNull(detail.windows.map((item) => item.isReturn));
  const oos = isFiniteNumber(detail.oosAnnualizedReturn)
    ? detail.oosAnnualizedReturn
    : averageNonNull(detail.windows.map((item) => item.oosReturn));

  if (!isFiniteNumber(avgIs) || !isFiniteNumber(oos) || Math.abs(avgIs) < 0.000001) {
    return { value: null, estimated: true };
  }

  return { value: oos / avgIs, estimated: true };
}

export function computeRobustnessStats(detail: WalkForwardRunDetail): RobustnessStats {
  const { value: wfe, estimated } = computeWalkForwardWfe(detail);
  const completedWindows = detail.windows.filter((item) => item.oosReturn !== null);
  const negativeWindowCount = completedWindows.filter((item) => (item.oosReturn ?? 0) <= 0).length;
  const negativeWindowRate =
    completedWindows.length > 0 ? negativeWindowCount / completedWindows.length : null;
  const avgIs = averageNonNull(detail.windows.map((item) => item.isReturn));
  const avgOos = averageNonNull(detail.windows.map((item) => item.oosReturn));
  const degradation =
    avgIs !== null && avgOos !== null ? avgIs - avgOos : (detail.isOosReturnVsIs ?? null);
  const sharpe = detail.oosSharpeRatio;

  let level: RobustnessLevel = 'RED';
  if (
    (wfe ?? 0) >= 0.7 &&
    (negativeWindowRate ?? 1) <= 0.3 &&
    (sharpe ?? Number.NEGATIVE_INFINITY) >= 1
  ) {
    level = 'GREEN';
  } else if ((wfe ?? 0) >= 0.5 && (negativeWindowRate ?? 1) <= 0.5 && (sharpe ?? -1) >= 0) {
    level = 'YELLOW';
  }

  return {
    wfe,
    wfeEstimated: estimated,
    negativeWindowCount,
    negativeWindowRate,
    degradation,
    level: detail.robustnessLevel ?? level,
  };
}

export function robustnessLabel(level: RobustnessLevel): string {
  if (level === 'GREEN') return '健壮';
  if (level === 'YELLOW') return '需复核';
  return '高风险';
}

export function robustnessColor(level: RobustnessLevel): 'success' | 'warning' | 'error' {
  if (level === 'GREEN') return 'success';
  if (level === 'YELLOW') return 'warning';
  return 'error';
}

export function formatPercentValue(value: number | null | undefined, digits = 2): string {
  if (!isFiniteNumber(value)) return '—';
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
}

export function formatNumberValue(value: number | null | undefined, digits = 2): string {
  if (!isFiniteNumber(value)) return '—';
  return value.toFixed(digits);
}

export function computeTotalParamCombinations(
  space: Record<
    string,
    { type: 'range' | 'enum'; min?: number; max?: number; step?: number; values?: unknown[] }
  >
): number {
  const items = Object.values(space);
  if (items.length === 0) return 0;

  return items.reduce((total, item) => {
    if (item.type === 'enum') return total * Math.max(1, item.values?.length ?? 0);
    const min = item.min ?? 0;
    const max = item.max ?? min;
    const step = item.step && item.step > 0 ? item.step : 1;
    return total * Math.max(1, Math.floor((max - min) / step) + 1);
  }, 1);
}
