import type { Chart as KLineChartInstance } from 'klinecharts';

import {
  aShareTimelineSlotIndex,
  A_SHARE_TIMELINE_SLOT_COUNT,
} from './market-kline-data';

import type { MarketPeriod, MarketKLineData } from './market-kline.types';

export const MARKET_KLINE_INITIAL_LIMIT = 150;
export const MARKET_KLINE_FORWARD_LIMIT = 100;
export const MARKET_TIMELINE_REFRESH_MS = 15_000;
export const MARKET_TIMELINE_AVG_INDICATOR = 'TIMELINE_AVG';

export const MARKET_KLINE_MIN_BAR_SPACE = 1;
export const MARKET_KLINE_MAX_BAR_SPACE = 32;
const TIMELINE_EDGE_PADDING = 24;

export const MARKET_KLINE_PERIOD_MAP = {
  T: { type: 'minute', span: 1 },
  D: { type: 'day', span: 1 },
  W: { type: 'week', span: 1 },
  M: { type: 'month', span: 1 },
} as const;

export function getMarketKlineErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function getMarketKlineWarning(rejectedCount: number, duplicateCount: number): string {
  const messages: string[] = [];
  if (rejectedCount > 0) messages.push(`${rejectedCount} 条异常 OHLC 已过滤`);
  if (duplicateCount > 0) messages.push(`${duplicateCount} 条重复时间数据已去重`);
  return messages.join('；');
}

export function fitLatestMarketViewport(
  chart: KLineChartInstance,
  period: MarketPeriod,
  data: MarketKLineData[],
  fallbackWidth: number
): void {
  if (period !== 'T') {
    chart.setOffsetRightDistance(0);
    return;
  }

  const width = chart.getSize('candle_pane', 'main')?.width ?? fallbackWidth;
  const lastSlot = aShareTimelineSlotIndex(data.at(-1)?.time ?? '');
  if (width <= 0 || data.length === 0 || lastSlot == null) {
    chart.setOffsetRightDistance(0);
    return;
  }

  const hasClosingPoint = lastSlot === A_SHARE_TIMELINE_SLOT_COUNT - 1;
  const visibleIntervalCount = Math.max(
    1,
    hasClosingPoint ? data.length - 1 : A_SHARE_TIMELINE_SLOT_COUNT - 1
  );
  const drawableWidth = Math.max(1, width - TIMELINE_EDGE_PADDING * 2);
  const barSpace = Math.min(
    MARKET_KLINE_MAX_BAR_SPACE,
    Math.max(MARKET_KLINE_MIN_BAR_SPACE, drawableWidth / visibleIntervalCount)
  );
  const remainingSlotCount = hasClosingPoint ? 0 : A_SHARE_TIMELINE_SLOT_COUNT - 1 - lastSlot;
  const labelSafeOffset = Math.max(0, TIMELINE_EDGE_PADDING - barSpace / 2);

  chart.setBarSpace(barSpace);
  chart.setOffsetRightDistance(labelSafeOffset + remainingSlotCount * barSpace);
}
