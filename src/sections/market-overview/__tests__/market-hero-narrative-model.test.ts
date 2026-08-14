import type { MarketBreadthResult } from 'src/api/market';

import {
  deriveMarketTone,
  getSentimentLabel,
  buildMarketHeadline,
} from '../market-hero-narrative-model';

function breadth(overrides: Partial<MarketBreadthResult> = {}): MarketBreadthResult {
  return {
    tradeDate: '20260808',
    limitUp: 20,
    limitDown: 2,
    bigRise: 10,
    rise: 35,
    flat: 10,
    fall: 35,
    bigFall: 10,
    total: 100,
    limitUpBroken: 1,
    consecutiveLimitGroups: [],
    ...overrides,
  };
}

describe('market hero narrative model', () => {
  it('独立按市场宽度与资金方向推导四种格局', () => {
    expect(
      deriveMarketTone(breadth({ bigRise: 10, rise: 60, fall: 15, bigFall: 5 }), 1)
    ).toBe('bullish');
    expect(
      deriveMarketTone(breadth({ bigRise: 5, rise: 10, fall: 55, bigFall: 20 }), -1)
    ).toBe('bearish');
    expect(deriveMarketTone(breadth(), null)).toBe('neutral');
    expect(
      deriveMarketTone(breadth({ bigRise: 10, rise: 50, fall: 20, bigFall: 10 }), -1)
    ).toBe('divergent');
    expect(
      deriveMarketTone(
        breadth({ bigRise: 0, rise: 0, flat: 0, fall: 0, bigFall: 0, total: 0 }),
        0
      )
    ).toBe('neutral');
  });

  it('标题使用强弱阈值，并只在真实极端值时追加涨停潮与资金提示', () => {
    expect(
      buildMarketHeadline(
        'bullish',
        breadth({ limitUp: 81, bigRise: 10, rise: 60, fall: 15, bigFall: 5 }),
        101
      )
    ).toBe('全面普涨，多头情绪占优 · 涨停潮 81 家 · 主力大幅流入');
    expect(
      buildMarketHeadline(
        'bearish',
        breadth({ bigRise: 5, rise: 10, fall: 55, bigFall: 20 }),
        -101
      )
    ).toBe('全面普跌，空头主导 · 主力大幅撤离');
    expect(buildMarketHeadline('divergent', breadth(), null)).toBe(
      '结构性分化，局部机会显现'
    );
    expect(buildMarketHeadline('neutral', breadth(), 0)).toBe('震荡整理，方向待明');
  });

  it('情绪标签在 20/40/60/80 边界切换且不发生区间重叠', () => {
    expect(getSentimentLabel(19.99)).toBe('极度恐惧');
    expect(getSentimentLabel(20)).toBe('偏恐惧');
    expect(getSentimentLabel(39.99)).toBe('偏恐惧');
    expect(getSentimentLabel(40)).toBe('中性');
    expect(getSentimentLabel(59.99)).toBe('中性');
    expect(getSentimentLabel(60)).toBe('偏贪婪');
    expect(getSentimentLabel(79.99)).toBe('偏贪婪');
    expect(getSentimentLabel(80)).toBe('极度贪婪');
  });
});
