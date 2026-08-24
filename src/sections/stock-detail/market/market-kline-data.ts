import type { StockChartItem } from 'src/api/stock';
import type { TodayTimelineResponse } from 'stock-sdk';

import type { MarketKLineData, MarketDataResult } from './market-kline.types';

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const MORNING_OPEN_MINUTES = 9 * 60 + 30;
const MORNING_CLOSE_MINUTES = 11 * 60 + 30;
const AFTERNOON_OPEN_MINUTES = 13 * 60;
const AFTERNOON_CLOSE_MINUTES = 15 * 60 + 30;

export const A_SHARE_TIMELINE_SLOT_COUNT =
  MORNING_CLOSE_MINUTES -
  MORNING_OPEN_MINUTES +
  1 +
  (AFTERNOON_CLOSE_MINUTES - AFTERNOON_OPEN_MINUTES + 1);

function finiteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

export function calculatePriceChange(
  priceValue: unknown,
  preCloseValue: unknown
): { amount: number; percent: number } | null {
  const price = finiteNumber(priceValue);
  const preClose = finiteNumber(preCloseValue);
  if (price == null || price <= 0 || preClose == null || preClose <= 0) return null;

  const amount = price - preClose;
  return { amount, percent: (amount / preClose) * 100 };
}

function dateParts(value: string): [number, number, number] | null {
  const match = value.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return [year, month, day];
}

export function toShanghaiTimestamp(tradeDate: string): number | null {
  const parts = dateParts(tradeDate);
  if (!parts) return null;
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day) - SHANGHAI_OFFSET_MS;
}

function canonicalTradeDate(value: string): string | null {
  const parts = dateParts(value);
  if (!parts) return null;
  const [year, month, day] = parts;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isValidOhlc(open: number, high: number, low: number, close: number): boolean {
  return high >= Math.max(open, close) && low <= Math.min(open, close) && low <= high;
}

export function aShareTimelineSlotIndex(time: string): number | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const minutes = Number(match[1]) * 60 + Number(match[2]);
  if (minutes >= MORNING_OPEN_MINUTES && minutes <= MORNING_CLOSE_MINUTES) {
    return minutes - MORNING_OPEN_MINUTES;
  }
  if (minutes >= AFTERNOON_OPEN_MINUTES && minutes <= AFTERNOON_CLOSE_MINUTES) {
    return MORNING_CLOSE_MINUTES - MORNING_OPEN_MINUTES + 1 + minutes - AFTERNOON_OPEN_MINUTES;
  }
  return null;
}

export function normalizeStockChartItems(items: StockChartItem[]): MarketDataResult {
  const byTimestamp = new Map<number, MarketKLineData>();
  let rejectedCount = 0;
  let duplicateCount = 0;

  items.forEach((item) => {
    const tradeDate = canonicalTradeDate(item.tradeDate);
    const timestamp = tradeDate ? toShanghaiTimestamp(tradeDate) : null;
    const open = finiteNumber(item.open);
    const high = finiteNumber(item.high);
    const low = finiteNumber(item.low);
    const close = finiteNumber(item.close);

    if (
      tradeDate == null ||
      timestamp == null ||
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      !isValidOhlc(open, high, low, close)
    ) {
      rejectedCount += 1;
      return;
    }

    if (byTimestamp.has(timestamp)) duplicateCount += 1;

    const volumeHands = finiteNumber(item.vol);
    const amountThousands = finiteNumber(item.amount);
    const pctChg = finiteNumber(item.pctChg);
    const ma5 = finiteNumber(item.ma5);
    const ma10 = finiteNumber(item.ma10);
    const ma20 = finiteNumber(item.ma20);
    const ma60 = finiteNumber(item.ma60);

    byTimestamp.set(timestamp, {
      timestamp,
      tradeDate,
      open,
      high,
      low,
      close,
      ...(volumeHands == null ? {} : { volume: volumeHands * 100, volumeHands }),
      ...(amountThousands == null ? {} : { turnover: amountThousands * 1000, amountThousands }),
      ...(pctChg == null ? {} : { pctChg }),
      ...(ma5 == null ? {} : { ma5 }),
      ...(ma10 == null ? {} : { ma10 }),
      ...(ma20 == null ? {} : { ma20 }),
      ...(ma60 == null ? {} : { ma60 }),
    });
  });

  return {
    bars: [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp),
    rejectedCount,
    duplicateCount,
  };
}

export function normalizeTodayTimeline(response: TodayTimelineResponse): MarketDataResult {
  const byTimestamp = new Map<number, MarketKLineData>();
  const tradeDate = canonicalTradeDate(response.date) ?? response.date;
  const preClose = finiteNumber(response.preClose);
  let rejectedCount = 0;
  let duplicateCount = 0;
  let previousVolume: number | null = null;
  let previousAmount: number | null = null;

  response.data.forEach((point) => {
    if (aShareTimelineSlotIndex(point.time) == null) return;

    const timestamp = finiteNumber(point.timestamp);
    const price = finiteNumber(point.price);
    const avgPrice = finiteNumber(point.avgPrice);
    const cumulativeVolume = finiteNumber(point.volume);
    const cumulativeAmount = finiteNumber(point.amount);

    if (timestamp == null || price == null || price <= 0) {
      rejectedCount += 1;
      return;
    }

    if (byTimestamp.has(timestamp)) duplicateCount += 1;

    const volume =
      cumulativeVolume == null || previousVolume == null
        ? 0
        : Math.max(0, cumulativeVolume - previousVolume);
    const turnover =
      cumulativeAmount == null || previousAmount == null
        ? 0
        : Math.max(0, cumulativeAmount - previousAmount);

    byTimestamp.set(timestamp, {
      timestamp,
      tradeDate,
      time: point.time,
      open: price,
      high: price,
      low: price,
      close: price,
      volume,
      volumeHands: volume / 100,
      turnover,
      amountThousands: turnover / 1000,
      ...(preClose == null ? {} : { preClose }),
      ...(avgPrice == null ? {} : { avgPrice }),
    });

    if (cumulativeVolume != null) previousVolume = cumulativeVolume;
    if (cumulativeAmount != null) previousAmount = cumulativeAmount;
  });

  return {
    bars: [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp),
    rejectedCount,
    duplicateCount,
  };
}

export function mergeMarketBars(
  current: MarketKLineData[],
  incoming: MarketKLineData[]
): MarketKLineData[] {
  const byTimestamp = new Map(current.map((bar) => [bar.timestamp, bar]));
  incoming.forEach((bar) => byTimestamp.set(bar.timestamp, bar));
  return [...byTimestamp.values()].sort((a, b) => a.timestamp - b.timestamp);
}

export function previousShanghaiTradeDate(timestamp: number): string {
  const shifted = new Date(timestamp + SHANGHAI_OFFSET_MS);
  shifted.setUTCDate(shifted.getUTCDate() - 1);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function isAShareTradingSession(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  const weekday = part('weekday');
  if (weekday === 'Sat' || weekday === 'Sun') return false;

  const minutes = Number(part('hour')) * 60 + Number(part('minute'));
  return (
    (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) ||
    (minutes >= 13 * 60 && minutes <= 15 * 60 + 30)
  );
}
