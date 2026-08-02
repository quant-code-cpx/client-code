import type { StockChartItem } from 'src/api/stock';
import type { TodayTimelineResponse } from 'stock-sdk';

import {
  mergeMarketBars,
  toShanghaiTimestamp,
  normalizeTodayTimeline,
  isAShareTradingSession,
  aShareTimelineSlotIndex,
  normalizeStockChartItems,
  previousShanghaiTradeDate,
  A_SHARE_TIMELINE_SLOT_COUNT,
} from '../market-kline-data';

const validItem: StockChartItem = {
  tradeDate: '2026-07-17',
  open: 10,
  high: 12,
  low: 9,
  close: 11,
  vol: 20,
  amount: 30,
  pctChg: 1.2,
  ma5: 10.5,
  ma10: 10,
  ma20: 9.5,
  ma60: 9,
};

describe('market-kline-data', () => {
  it('把交易日按上海时区解析，并按 KLineChart 单位归一化', () => {
    const result = normalizeStockChartItems([
      validItem,
      { ...validItem, tradeDate: '20260718', close: 11.5 },
      { ...validItem, tradeDate: '2026-07-19', high: 9 },
    ]);

    expect(result.rejectedCount).toBe(1);
    expect(result.bars).toHaveLength(2);
    expect(result.bars[0]).toMatchObject({
      timestamp: Date.UTC(2026, 6, 16, 16),
      tradeDate: '2026-07-17',
      volume: 2000,
      volumeHands: 20,
      turnover: 30000,
      amountThousands: 30,
    });
  });

  it('同时间戳以后到数据覆盖，并保持升序', () => {
    const first = normalizeStockChartItems([validItem]).bars[0];
    const later = normalizeStockChartItems([
      { ...validItem, tradeDate: '2026-07-16', close: 10.2 },
      { ...validItem, close: 11.8 },
    ]).bars;

    const merged = mergeMarketBars([first], later);
    expect(merged.map((bar) => bar.tradeDate)).toEqual(['2026-07-16', '2026-07-17']);
    expect(merged[1].close).toBe(11.8);
  });

  it('把分时累计成交量转换为单周期增量，首条不伪造成交量', () => {
    const response: TodayTimelineResponse = {
      code: 'sh600519',
      date: '20260717',
      timestamp: Date.UTC(2026, 6, 16, 16),
      tz: 'Asia/Shanghai' as const,
      preClose: 10,
      data: [
        {
          time: '09:30',
          timestamp: Date.UTC(2026, 6, 17, 1, 30),
          tz: 'Asia/Shanghai',
          price: 10.1,
          avgPrice: 10.05,
          volume: 1000,
          amount: 10100,
        },
        {
          time: '09:31',
          timestamp: Date.UTC(2026, 6, 17, 1, 31),
          tz: 'Asia/Shanghai',
          price: 10.2,
          avgPrice: 10.1,
          volume: 1600,
          amount: 16220,
        },
      ],
    };

    const result = normalizeTodayTimeline(response);
    expect(result.bars[0]).toMatchObject({
      tradeDate: '2026-07-17',
      preClose: 10,
      volume: 0,
      turnover: 0,
      avgPrice: 10.05,
    });
    expect(result.bars[1]).toMatchObject({ volume: 600, volumeHands: 6, turnover: 6120 });
  });

  it('分时保留 09:30–11:30 和 13:00–15:30，覆盖盘后定价交易', () => {
    const point = (time: string, index: number) => ({
      time,
      timestamp: Date.UTC(2026, 6, 17, 1, 30 + index),
      tz: 'Asia/Shanghai' as const,
      price: 10 + index / 100,
      avgPrice: 10,
      volume: 1000 + index * 100,
      amount: 10000 + index * 1000,
    });
    const response: TodayTimelineResponse = {
      code: 'sh600519',
      date: '20260717',
      timestamp: Date.UTC(2026, 6, 16, 16),
      tz: 'Asia/Shanghai',
      preClose: 10,
      data: [
        point('09:29', 0),
        point('09:30', 1),
        point('11:30', 2),
        point('12:00', 3),
        point('13:00', 4),
        point('15:00', 5),
        point('15:01', 6),
        point('15:30', 7),
      ],
    };

    const result = normalizeTodayTimeline(response);
    expect(result.bars.map((bar) => bar.time)).toEqual([
      '09:30',
      '11:30',
      '13:00',
      '15:00',
      '15:01',
      '15:30',
    ]);
    expect(aShareTimelineSlotIndex('09:30')).toBe(0);
    expect(aShareTimelineSlotIndex('15:30')).toBe(A_SHARE_TIMELINE_SLOT_COUNT - 1);
    expect(A_SHARE_TIMELINE_SLOT_COUNT).toBe(272);
  });

  it('历史分页边界取最旧上海交易日的前一天', () => {
    const timestamp = toShanghaiTimestamp('2026-01-01');
    expect(timestamp).not.toBeNull();
    expect(previousShanghaiTradeDate(timestamp as number)).toBe('20251231');
  });

  it('盘后定价交易期间持续刷新到 15:30，15:31 停止', () => {
    expect(isAShareTradingSession(new Date('2026-07-17T07:30:00.000Z'))).toBe(true);
    expect(isAShareTradingSession(new Date('2026-07-17T07:31:00.000Z'))).toBe(false);
  });
});
