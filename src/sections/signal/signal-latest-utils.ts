import type { Dayjs } from 'dayjs';
import type { TradingSignalItem, SignalDiffFromPrev } from 'src/api/signal';

import dayjs from 'dayjs';

export const SIGNAL_DATE_FORMAT = 'YYYYMMDD';

export function dayjsToTradeDate(date: Dayjs | null): string {
  return date ? date.format(SIGNAL_DATE_FORMAT) : '';
}

export function tradeDateToDayjs(value: string): Dayjs | null {
  if (!value) return null;
  const date = dayjs(value, SIGNAL_DATE_FORMAT);
  return date.isValid() ? date : null;
}

export function lastTradingDayjs(from: Dayjs = dayjs()): Dayjs {
  let date = from;
  while (date.day() === 0 || date.day() === 6) date = date.subtract(1, 'day');
  return date;
}

export function shouldDisableWeekend(date: Dayjs): boolean {
  return date.day() === 0 || date.day() === 6;
}

export function computeFrontendSignalDiff(
  current: TradingSignalItem[],
  previous: TradingSignalItem[],
  prevTradeDate: string
): SignalDiffFromPrev {
  const previousByCode = new Map(previous.map((signal) => [signal.tsCode, signal]));
  const currentByCode = new Map(current.map((signal) => [signal.tsCode, signal]));
  const added: TradingSignalItem[] = [];
  const removed: TradingSignalItem[] = [];
  const rebalanced: SignalDiffFromPrev['rebalanced'] = [];

  current.forEach((signal) => {
    if (signal.action !== 'HOLD' && !previousByCode.has(signal.tsCode)) added.push(signal);
  });
  previous.forEach((signal) => {
    if (signal.action !== 'HOLD' && !currentByCode.has(signal.tsCode)) removed.push(signal);
  });
  current.forEach((signal) => {
    const previousSignal = previousByCode.get(signal.tsCode);
    if (!previousSignal) return;
    const currentWeight = signal.targetWeight ?? 0;
    const previousWeight = previousSignal.targetWeight ?? 0;
    if (Math.abs(currentWeight - previousWeight) <= 0.0001) return;
    rebalanced.push({
      tsCode: signal.tsCode,
      stockName: signal.stockName,
      prevWeight: previousWeight,
      newWeight: currentWeight,
      delta: currentWeight - previousWeight,
    });
  });

  return { prevTradeDate, added, removed, rebalanced };
}
