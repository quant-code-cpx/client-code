import type { HeatmapItem } from 'src/api/heatmap';
import type { SectorFlowItem } from 'src/api/market';

import {
  aggregateSectors,
  computeDistribution,
  pickScatterLabelKeys,
  hasScatterCoordinates,
  summarizeSectorStocks,
  computeLinearAxisBounds,
  buildScatterInsightLists,
  pickCrowdedScatterSectors,
  buildDistributionSegments,
} from '../utils';

// ----------------------------------------------------------------------

function sector(
  tsCode: string,
  name: string,
  pctChange: number,
  netAmountYi: number
): SectorFlowItem {
  return {
    tsCode,
    tradeDate: '20260808',
    contentType: 'INDUSTRY',
    name,
    pctChange,
    close: null,
    netAmount: netAmountYi * 100_000_000,
    netAmountRate: null,
    buyElgAmount: null,
    buyElgAmountRate: null,
    buyLgAmount: null,
    buyLgAmountRate: null,
    buyMdAmount: null,
    buyMdAmountRate: null,
    buySmAmount: null,
    buySmAmountRate: null,
    buySmAmountStock: null,
    rank: null,
  };
}

const sampleSectors: SectorFlowItem[] = [
  sector('A', '银行', 0.2, 12),
  sector('B', '有色金属', 5.8, 3),
  sector('C', '传媒', -6.1, -2),
  sector('D', '电子', 1.6, -18),
  sector('E', '医药生物', 0.1, 0.2),
  sector('F', '机械设备', -0.2, -0.1),
  sector('G', '基础化工', 0.3, -0.3),
  sector('H', '国防军工', -0.1, 0.4),
  sector('I', '食品饮料', 2.2, 1.1),
  sector('J', '房地产', -2.8, -1.2),
];

// ----------------------------------------------------------------------

describe('buildScatterInsightLists', () => {
  it('builds directional lists so users can read sectors without relying on dense chart labels', () => {
    const lists = buildScatterInsightLists(sampleSectors, 2);

    expect(lists.topInflow.map((item) => item.name)).toEqual(['银行', '有色金属']);
    expect(lists.topOutflow.map((item) => item.name)).toEqual(['电子', '传媒']);
    expect(lists.topGainers.map((item) => item.name)).toEqual(['有色金属', '食品饮料']);
    expect(lists.topLosers.map((item) => item.name)).toEqual(['传媒', '房地产']);
  });

  it('surfaces central crowded sectors that are easy to miss when bubbles overlap near zero axes', () => {
    const crowded = pickCrowdedScatterSectors(sampleSectors, 3);

    expect(crowded.map((item) => item.name)).toEqual(['医药生物', '机械设备', '国防军工']);
    expect(crowded.every((item) => Math.abs(Number(item.pctChange)) <= 0.3)).toBe(true);
    expect(crowded.every((item) => Math.abs(Number(item.netAmount)) <= 0.4 * 100_000_000)).toBe(
      true
    );
  });

  it('excludes sectors missing either real scatter coordinate from every index', () => {
    const missingPct = { ...sector('K', '缺涨跌幅', 1, 2), pctChange: null };
    const missingFlow = { ...sector('L', '缺净流入', 1, 2), netAmount: null };
    const lists = buildScatterInsightLists([...sampleSectors, missingPct, missingFlow], 20);
    const indexedCodes = [
      ...lists.topInflow,
      ...lists.topOutflow,
      ...lists.topGainers,
      ...lists.topLosers,
      ...lists.crowded,
    ].map((item) => item.tsCode);

    expect(hasScatterCoordinates(missingPct)).toBe(false);
    expect(hasScatterCoordinates(missingFlow)).toBe(false);
    expect(indexedCodes).not.toContain('K');
    expect(indexedCodes).not.toContain('L');
  });

  it('keeps every sector reachable from the five information-index groups', () => {
    const lists = buildScatterInsightLists(sampleSectors, sampleSectors.length);
    const indexedKeys = new Set(
      [
        ...lists.topInflow,
        ...lists.topOutflow,
        ...lists.topGainers,
        ...lists.topLosers,
        ...lists.crowded,
      ].map((item) => item.tsCode)
    );

    expect(indexedKeys).toEqual(new Set(sampleSectors.map((item) => item.tsCode)));
  });
});

describe('pickScatterLabelKeys', () => {
  it('limits on-chart labels to the highest-signal sectors instead of labeling every bubble', () => {
    const labels = pickScatterLabelKeys(sampleSectors, 4);

    expect(labels.size).toBe(4);
    expect(labels.has('A')).toBe(true);
    expect(labels.has('D')).toBe(true);
    expect(labels.has('B')).toBe(true);
    expect(labels.has('C')).toBe(true);
    expect(labels.has('E')).toBe(false);
  });
});

describe('computeLinearAxisBounds', () => {
  it('uses fallback bounds for empty and non-finite inputs', () => {
    expect(computeLinearAxisBounds([], { min: -5, max: 5 })).toEqual({ min: -5, max: 5 });
    expect(
      computeLinearAxisBounds([Number.NaN, Number.POSITIVE_INFINITY], { min: -2, max: 2 })
    ).toEqual({
      min: -2,
      max: 2,
    });
  });

  it.each([
    [[0], { min: -0.08, max: 0.08 }],
    [[5], { min: 4.6, max: 5.4 }],
    [[3, 3], { min: 2.76, max: 3.24 }],
  ])('creates a finite range for single/all-zero/same values', (values, expected) => {
    expect(computeLinearAxisBounds(values as number[], { min: -1, max: 1 })).toEqual(expected);
  });

  it('keeps extreme outliers visible with 8% full-range padding', () => {
    expect(computeLinearAxisBounds([-1, 0, 2, 100], { min: -5, max: 5 })).toEqual({
      min: -9.08,
      max: 108.08,
    });
  });
});

describe('heatmap distribution', () => {
  it('keeps missing changes out of flat counts and distribution buckets', () => {
    const changes = [-12, -10, -5.5, -0.2, 0, 0.2, 4.9, 5, 9.9, 14, Number.NaN];
    const items = changes.map(
      (pctChg, index) =>
        ({
          tsCode: String(index),
          name: String(index),
          groupName: '测试',
          industry: '测试',
          pctChg,
          totalMv: 1,
          amount: 1,
        }) satisfies HeatmapItem
    );

    const distribution = computeDistribution(items);
    const bucketTotal = distribution.ranges.reduce((total, range) => total + range.count, 0);
    const segmentTotal = buildDistributionSegments(distribution).reduce(
      (total, segment) => total + segment.count,
      0
    );

    expect(distribution.ranges).toHaveLength(21);
    expect(distribution.missingCount).toBe(1);
    expect(bucketTotal).toBe(items.length - 1);
    expect(segmentTotal).toBe(items.length - 1);
  });

  it('excludes missing changes from sector averages and direction counts', () => {
    const sectors = aggregateSectors([
      {
        tsCode: 'A',
        name: 'A',
        groupName: '测试',
        industry: '测试',
        pctChg: 2,
        totalMv: 1,
        amount: 1,
      },
      {
        tsCode: 'B',
        name: 'B',
        groupName: '测试',
        industry: '测试',
        pctChg: null,
        totalMv: 1,
        amount: 1,
      },
    ]);

    expect(sectors).toEqual([
      expect.objectContaining({
        avgPctChg: 2,
        stockCount: 2,
        upCount: 1,
        downCount: 0,
        flatCount: 0,
      }),
    ]);
  });
});

describe('summarizeSectorStocks', () => {
  it('derives turnover and rise/fall counts from real stock rows', () => {
    const summary = summarizeSectorStocks([
      {
        tsCode: 'A',
        name: 'A',
        groupName: '测试',
        industry: '测试',
        pctChg: 1.2,
        totalMv: null,
        amount: 100_000,
      },
      {
        tsCode: 'B',
        name: 'B',
        groupName: '测试',
        industry: '测试',
        pctChg: -0.8,
        totalMv: null,
        amount: 50_000,
      },
      {
        tsCode: 'C',
        name: 'C',
        groupName: '测试',
        industry: '测试',
        pctChg: null,
        totalMv: null,
        amount: null,
      },
    ]);

    expect(summary).toEqual({ totalAmountYi: 1.5, upCount: 1, downCount: 1 });
  });

  it('keeps unavailable summaries null instead of manufacturing zeros', () => {
    expect(summarizeSectorStocks([])).toEqual({
      totalAmountYi: null,
      upCount: null,
      downCount: null,
    });
    expect(
      summarizeSectorStocks([
        {
          tsCode: 'A',
          name: 'A',
          groupName: '测试',
          industry: '测试',
          pctChg: null,
          totalMv: null,
          amount: null,
        },
      ])
    ).toEqual({ totalAmountYi: null, upCount: null, downCount: null });
  });
});
