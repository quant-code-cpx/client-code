import {
  fetchSentiment,
  fetchIndexTrend,
  fetchSectorFlow,
  fetchConceptList,
  type ConceptItem,
  fetchMarketBreadth,
  fetchConceptMembers,
  fetchMoneyFlowTrend,
  fetchRotationDetail,
  type IndexTrendItem,
  type SectorFlowItem,
  fetchRotationHeatmap,
  fetchSectorFlowTrend,
  fetchStockFlowDetail,
  type SentimentResult,
  fetchSectorFlowRanking,
  fetchChangeDistribution,
  type MoneyFlowTrendItem,
  type StockFlowDetailItem,
  type HsgtFlowHistoryItem,
  type SectorFlowTrendItem,
  type SectorFlowRankingItem,
} from '../market';

vi.mock('src/api/client', () => ({
  apiClient: { post: vi.fn() },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Market API contract', () => {
  it('keeps backend nullable leaves explicit in public types', () => {
    expectTypeOf<Pick<IndexTrendItem, 'close' | 'pctChg' | 'vol' | 'amount'>>().toEqualTypeOf<{
      close: number | null;
      pctChg: number | null;
      vol: number | null;
      amount: number | null;
    }>();
    expectTypeOf<
      Pick<MoneyFlowTrendItem, 'buyElgAmount' | 'buyLgAmount' | 'buyMdAmount' | 'buySmAmount'>
    >().toEqualTypeOf<{
      buyElgAmount: number | null;
      buyLgAmount: number | null;
      buyMdAmount: number | null;
      buySmAmount: number | null;
    }>();
    expectTypeOf<
      Pick<
        SectorFlowRankingItem,
        | 'name'
        | 'pctChange'
        | 'close'
        | 'netAmount'
        | 'netAmountRate'
        | 'buyElgAmount'
        | 'buyLgAmount'
        | 'buyMdAmount'
        | 'buySmAmount'
      >
    >().toEqualTypeOf<{
      name: string | null;
      pctChange: number | null;
      close: number | null;
      netAmount: number | null;
      netAmountRate: number | null;
      buyElgAmount: number | null;
      buyLgAmount: number | null;
      buyMdAmount: number | null;
      buySmAmount: number | null;
    }>();
    expectTypeOf<Pick<SectorFlowTrendItem, 'pctChange' | 'netAmount'>>().toEqualTypeOf<{
      pctChange: number | null;
      netAmount: number | null;
    }>();
    expectTypeOf<HsgtFlowHistoryItem['tradeDate']>().toEqualTypeOf<string | null>();
    expectTypeOf<
      Pick<
        StockFlowDetailItem,
        | 'buyElgAmount'
        | 'sellElgAmount'
        | 'buyLgAmount'
        | 'sellLgAmount'
        | 'buyMdAmount'
        | 'sellMdAmount'
        | 'buySmAmount'
        | 'sellSmAmount'
        | 'netMfAmount'
      >
    >().toEqualTypeOf<{
      buyElgAmount: number | null;
      sellElgAmount: number | null;
      buyLgAmount: number | null;
      sellLgAmount: number | null;
      buyMdAmount: number | null;
      sellMdAmount: number | null;
      buySmAmount: number | null;
      sellSmAmount: number | null;
      netMfAmount: number | null;
    }>();

    type SentimentResponse = Awaited<ReturnType<typeof fetchSentiment>>;
    expectTypeOf<SentimentResponse>().toEqualTypeOf<SentimentResult | null>();
  });

  it('passes nullable market payloads and leaves through without coercion', async () => {
    mockPost()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        tsCode: '000001.SH',
        name: '上证指数',
        period: '1m',
        data: [{ tradeDate: '2026-08-11', close: null, pctChg: null, vol: null, amount: null }],
      })
      .mockResolvedValueOnce({
        data: [
          {
            tradeDate: '2026-08-11',
            netAmount: 0,
            cumulativeNet: 0,
            buyElgAmount: null,
            buyLgAmount: null,
            buyMdAmount: null,
            buySmAmount: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        tradeDate: null,
        contentType: 'INDUSTRY',
        topInflow: [
          {
            tsCode: 'BK001.DC',
            name: null,
            pctChange: null,
            close: null,
            netAmount: null,
            netAmountRate: null,
            buyElgAmount: null,
            buyLgAmount: null,
            buyMdAmount: null,
            buySmAmount: null,
          },
        ],
        topOutflow: [],
      })
      .mockResolvedValueOnce({
        tsCode: 'BK001.DC',
        name: null,
        data: [{ tradeDate: '2026-08-11', pctChange: null, netAmount: null, cumulativeNet: 0 }],
      })
      .mockResolvedValueOnce({
        tsCode: '000001.SZ',
        name: null,
        data: [
          {
            tradeDate: '2026-08-11',
            mainNetInflow: 0,
            retailNetInflow: 0,
            buyElgAmount: null,
            sellElgAmount: null,
            buyLgAmount: null,
            sellLgAmount: null,
            buyMdAmount: null,
            sellMdAmount: null,
            buySmAmount: null,
            sellSmAmount: null,
            netMfAmount: null,
          },
        ],
      });

    await expect(fetchSentiment()).resolves.toBeNull();
    await expect(fetchChangeDistribution()).resolves.toBeNull();
    await expect(fetchMarketBreadth()).resolves.toBeNull();
    await expect(fetchIndexTrend()).resolves.toMatchObject({
      data: [{ close: null, pctChg: null, vol: null, amount: null }],
    });
    await expect(fetchMoneyFlowTrend()).resolves.toMatchObject({
      data: [{ netAmount: 0, buyElgAmount: null, buyLgAmount: null }],
    });
    await expect(fetchSectorFlowRanking({ dual: true })).resolves.toMatchObject({
      tradeDate: null,
      topInflow: [{ name: null, netAmount: null }],
    });
    await expect(fetchSectorFlowTrend({ ts_code: 'BK001.DC' })).resolves.toMatchObject({
      name: null,
      data: [{ pctChange: null, netAmount: null }],
    });
    await expect(fetchStockFlowDetail({ ts_code: '000001.SZ' })).resolves.toMatchObject({
      name: null,
      data: [{ buyElgAmount: null, sellElgAmount: null, netMfAmount: null }],
    });
  });

  it('maps sector-flow to its real Prisma shape and drops nonexistent fields', async () => {
    const rawItem = {
      tsCode: 'BK001.DC',
      tradeDate: '2026-08-11T00:00:00.000Z',
      contentType: 'INDUSTRY',
      name: null,
      pctChange: null,
      close: null,
      netAmount: null,
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
      amount: 999,
      upCount: 99,
      downCount: 88,
      leadStock: '不存在',
      leadPctChg: 10,
    };
    mockPost().mockResolvedValueOnce({
      tradeDate: '2026-08-11T00:00:00.000Z',
      industry: [rawItem],
      concept: [],
      region: [],
    });

    const result = await fetchSectorFlow({ content_type: 'INDUSTRY' });

    expect(result.industry[0]).toEqual({
      tsCode: 'BK001.DC',
      tradeDate: '2026-08-11T00:00:00.000Z',
      contentType: 'INDUSTRY',
      name: null,
      pctChange: null,
      close: null,
      netAmount: null,
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
    });
    expect(result.industry[0]).not.toHaveProperty('amount');
    expectTypeOf<SectorFlowItem>().toEqualTypeOf<typeof result.industry[number]>();
  });

  it('keeps concept nulls and does not fabricate trading fields', async () => {
    mockPost()
      .mockResolvedValueOnce({
        total: 1,
        page: 1,
        pageSize: 30,
        items: [{ tsCode: '885001.TI', name: '机器人', count: null, listDate: null }],
      })
      .mockResolvedValueOnce({
        tsCode: '885001.TI',
        name: null,
        total: 1,
        items: [{ conCode: '000001.SZ', conName: null }],
      });

    const list = await fetchConceptList();
    const members = await fetchConceptMembers({ tsCode: '885001.TI' });

    expect(list).toEqual({
      total: 1,
      page: 1,
      pageSize: 30,
      items: [{ code: '885001.TI', name: '机器人', count: null, listDate: null }],
    });
    expect(members).toEqual({
      conceptCode: '885001.TI',
      conceptName: null,
      total: 1,
      members: [{ tsCode: '000001.SZ', name: null }],
    });
    expectTypeOf<ConceptItem['count']>().toEqualTypeOf<number | null>();
  });

  it('does not turn unavailable rotation values into zero or empty strings', async () => {
    mockPost()
      .mockResolvedValueOnce({
        tradeDate: '20260811',
        periods: [20],
        industries: [{ tsCode: 'BK001.DC', name: null, returns: { 20: null } }],
      })
      .mockResolvedValueOnce({
        industry: '电子',
        tsCode: 'BK001.DC',
        returnTrend: [],
        flowTrend: [],
        valuation: null,
        topStocks: [],
      });

    await expect(fetchRotationHeatmap({ periods: [20] })).resolves.toEqual({
      tradeDate: '20260811',
      sectors: [{ name: 'BK001.DC', pctChange: null }],
    });
    await expect(fetchRotationDetail({ industry: '电子' })).resolves.toMatchObject({
      sectorName: '电子',
      tradeDate: null,
      pctChange: null,
      netAmount: null,
    });
  });
});
