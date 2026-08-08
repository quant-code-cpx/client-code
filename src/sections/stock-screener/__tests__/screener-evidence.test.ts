import type { StockScreenerItem } from 'src/api/screener';

import { buildFilterSummaries, buildScreenerEvidence } from '../screener-evidence';

const item: StockScreenerItem = {
  tsCode: '000001.SZ',
  name: '平安银行',
  industry: '银行',
  market: '主板',
  listDate: '1991-04-03',
  close: 12.34,
  pctChg: 1.25,
  amount: 456789,
  turnoverRate: 6.42,
  peTtm: 8.8,
  pb: 0.9,
  dvTtm: 3.2,
  totalMv: 1230000,
  circMv: 980000,
  revenueYoy: 12,
  netprofitYoy: 18,
  roe: 11,
  grossMargin: null,
  netMargin: 25,
  debtToAssets: 55,
  currentRatio: 1.2,
  quickRatio: 1.1,
  ocfToNetprofit: 0.95,
  mainNetInflow5d: 12000,
  mainNetInflow20d: 25000,
  latestFinDate: '2026-06-30',
  psTtm: 2.1,
  buySignalCount: 2,
  buySignals: ['MACD_GOLDEN_CROSS', 'MA_BULLISH'],
  concepts: ['中特估', '高股息'],
};

describe('选股证据适配', () => {
  it('只用 StockScreenerItem 已有实际字段，并将缺失技术值标记为服务端校验', () => {
    const evidence = buildScreenerEvidence(item, {
      minTurnoverRate: 2,
      macdSignal: 'golden_cross',
      northboundOnly: true,
    });

    expect(evidence).toEqual([
      {
        key: 'minTurnoverRate',
        label: '换手率',
        target: '≥ 2%',
        actual: '6.42%',
        verified: false,
        financial: undefined,
      },
      {
        key: 'macdSignal',
        label: 'MACD 信号',
        target: '金叉',
        actual: undefined,
        verified: true,
        financial: undefined,
      },
      {
        key: 'northboundOnly',
        label: '北向持仓',
        target: '是',
        actual: undefined,
        verified: true,
        financial: undefined,
      },
    ]);
  });

  it('响应实际值为 null 时展示破折号，不伪造 0', () => {
    expect(buildScreenerEvidence(item, { minGrossMargin: 30 })[0]).toMatchObject({
      key: 'minGrossMargin',
      actual: '—',
      verified: false,
      financial: true,
    });
  });

  it('执行摘要明确条件关系素材，零条件保持空数组', () => {
    expect(buildFilterSummaries({})).toEqual([]);
    expect(buildFilterSummaries({ minPeTtm: 5, maxPeTtm: 15 })).toEqual([
      'PE TTM ≥ 5',
      'PE TTM ≤ 15',
    ]);
  });
});
