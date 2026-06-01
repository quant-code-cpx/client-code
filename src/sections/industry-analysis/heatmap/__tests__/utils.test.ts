import type { SectorFlowItem } from 'src/api/market';

import {
  pickScatterLabelKeys,
  buildScatterInsightLists,
  pickCrowdedScatterSectors,
} from '../utils';

// ----------------------------------------------------------------------

function sector(
  tsCode: string,
  name: string,
  pctChange: number,
  netAmountYi: number,
  amountYi = 80
): SectorFlowItem {
  return {
    tsCode,
    name,
    pctChange,
    close: 0,
    amount: amountYi * 10000,
    netAmount: netAmountYi * 100_000_000,
    netAmountRate: 0,
    upCount: 0,
    downCount: 0,
    leadStock: null,
    leadPctChg: null,
  };
}

const sampleSectors: SectorFlowItem[] = [
  sector('A', '银行', 0.2, 12, 220),
  sector('B', '有色金属', 5.8, 3, 160),
  sector('C', '传媒', -6.1, -2, 150),
  sector('D', '电子', 1.6, -18, 210),
  sector('E', '医药生物', 0.1, 0.2, 340),
  sector('F', '机械设备', -0.2, -0.1, 300),
  sector('G', '基础化工', 0.3, -0.3, 260),
  sector('H', '国防军工', -0.1, 0.4, 240),
  sector('I', '食品饮料', 2.2, 1.1, 120),
  sector('J', '房地产', -2.8, -1.2, 110),
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

    expect(crowded.map((item) => item.name)).toEqual(['医药生物', '机械设备', '基础化工']);
    expect(crowded.every((item) => Math.abs(item.pctChange) <= 0.3)).toBe(true);
    expect(crowded.every((item) => Math.abs(item.netAmount) <= 0.4 * 100_000_000)).toBe(true);
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
