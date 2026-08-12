import { it, vi, expect, describe, afterEach } from 'vitest';

import { apiClient } from '../client';
import {
  addHolding,
  detectDrift,
  rebalancePlan,
  removeHolding,
  updateHolding,
  queryTradeLog,
  getPerformance,
  tradeLogSummary,
  createApplyBacktestIdempotencyKey,
  createHoldingMutationIdempotencyKey,
} from '../portfolio';

vi.mock('../client', () => ({ apiClient: { post: vi.fn() } }));

// ----------------------------------------------------------------------

describe('portfolio holding mutation API contract', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates a new server-valid key for each holding action', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
        .mockReturnValueOnce('22222222-2222-4222-8222-222222222222'),
    });

    const addKey = createHoldingMutationIdempotencyKey('add');
    const retryKey = createHoldingMutationIdempotencyKey('add');

    expect(addKey).toMatch(/^portfolio-holding:add:/);
    expect(addKey.length).toBeGreaterThanOrEqual(8);
    expect(addKey.length).toBeLessThanOrEqual(128);
    expect(retryKey).not.toBe(addKey);
  });

  it('generates a server-valid key for applying a backtest', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('33333333-3333-4333-8333-333333333333'),
    });

    const key = createApplyBacktestIdempotencyKey();

    expect(key).toMatch(/^portfolio-apply-backtest:/);
    expect(key.length).toBeGreaterThanOrEqual(8);
    expect(key.length).toBeLessThanOrEqual(128);
  });

  it('sends required fresh idempotency keys with add, update, and remove bodies', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    const addKey = createHoldingMutationIdempotencyKey('add');
    await addHolding({
      portfolioId: 'portfolio-1',
      tsCode: '000001.SZ',
      quantity: 100,
      avgCost: 12.5,
      idempotencyKey: addKey,
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/portfolio/holding/add', {
      portfolioId: 'portfolio-1',
      tsCode: '000001.SZ',
      quantity: 100,
      avgCost: 12.5,
      idempotencyKey: addKey,
    });

    const updateKey = createHoldingMutationIdempotencyKey('update');
    await updateHolding({ holdingId: 'holding-1', quantity: 200, avgCost: 13, idempotencyKey: updateKey });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/portfolio/holding/update', {
      holdingId: 'holding-1',
      quantity: 200,
      avgCost: 13,
      idempotencyKey: updateKey,
    });

    const removeKey = createHoldingMutationIdempotencyKey('remove');
    await removeHolding({ holdingId: 'holding-1', idempotencyKey: removeKey });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api/portfolio/holding/remove', {
      holdingId: 'holding-1',
      idempotencyKey: removeKey,
    });
  });
});

describe('portfolio analysis API adapters', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps the server rebalance plan while preserving action quantities', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      portfolioId: 'portfolio-1',
      portfolioName: '长期组合',
      refDate: '2026-08-08',
      totalValue: 500_000,
      items: [
        {
          tsCode: '000001.SZ',
          stockName: '平安银行',
          currentShares: 100,
          currentPrice: 12.5,
          currentMarketValue: 1_250,
          currentWeight: 0.0025,
          targetWeight: 0.1,
          targetShares: 4_000,
          targetMarketValue: 50_000,
          action: 'BUY',
          skipReason: null,
          deltaShares: 3_900,
          deltaAmount: 48_750,
          estimatedTradingCost: 12.19,
        },
      ],
      summary: {
        totalBuyAmount: 48_750,
        totalSellProceeds: 0,
        totalTradingCost: 12.19,
        buyCount: 1,
        sellCount: 0,
        adjustCount: 0,
        holdCount: 0,
        skipCount: 0,
        cashBefore: 100_000,
        cashAfter: 51_237.81,
        isFeasible: true,
      },
    });

    const request = {
      portfolioId: 'portfolio-1',
      targets: [
        { tsCode: '000001.SZ', targetWeight: 0.1 },
      ],
      omitUnspecified: 'SELL' as const,
      totalValue: 500_000,
    };
    const result = await rebalancePlan(request);

    expect(apiClient.post).toHaveBeenCalledWith('/api/portfolio/rebalance-plan', request);
    expect(result).toMatchObject({
      portfolioId: 'portfolio-1',
      totalValue: 500_000,
      priceDate: '2026-08-08',
      estimatedCost: 12.19,
      actions: [
        {
          tsCode: '000001.SZ',
          action: 'BUY',
          previousQuantity: 100,
          targetQuantity: 4_000,
          deltaQuantity: 3_900,
        },
      ],
      summary: { added: 1, updated: 0, removed: 0, unchanged: 0 },
    });
  });

  it('renames server performance metrics and keeps the requested date range', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      portfolioId: 'portfolio-1',
      startDate: '2026-01-01',
      endDate: '2026-08-08',
      benchmarkTsCode: '000300.SH',
      dailySeries: [
        {
          date: '2026-08-08',
          portfolioNav: 1.08,
          benchmarkNav: 1.03,
          dailyReturn: 0.01,
          benchmarkReturn: 0.005,
          excessReturn: 0.005,
          cumulativeExcess: 0.05,
        },
      ],
      metrics: {
        totalReturn: 0.08,
        benchmarkTotalReturn: 0.03,
        cumulativeExcessReturn: 0.05,
        annualizedReturn: 0.12,
        annualizedVolatility: 0.18,
        trackingError: 0.07,
        informationRatio: 0.71,
        maxDrawdown: 0.04,
        sharpeRatio: 0.56,
      },
    });

    const request = {
      portfolioId: 'portfolio-1',
      startDate: '20260101',
      endDate: '20260808',
      benchmarkTsCode: '000300.SH',
    };
    const result = await getPerformance(request);

    expect(apiClient.post).toHaveBeenCalledWith('/api/portfolio/performance', request);
    expect(result).toMatchObject({
      portfolioId: 'portfolio-1',
      startDate: '2026-01-01',
      endDate: '2026-08-08',
      benchmarkTsCode: '000300.SH',
      series: [{ date: '2026-08-08', portfolioNav: 1.08, benchmarkNav: 1.03 }],
      metrics: {
        totalReturn: 0.08,
        annualizedReturn: 0.12,
        benchmarkReturn: 0.03,
        excessReturn: 0.05,
        trackingError: 0.07,
        informationRatio: 0.71,
        maxDrawdown: 0.04,
        sharpeRatio: 0.56,
      },
    });
  });

  it('maps drift flags and preserves unavailable position weights as null', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      portfolioId: 'portfolio-1',
      strategyId: 'strategy-1',
      tradeDate: '20260808',
      totalDriftScore: 0.35,
      isAlert: true,
      alertThreshold: 0.3,
      positionDrift: 0.2,
      weightDrift: 0.1,
      industryDrift: 0.05,
      items: [
        {
          tsCode: '600519.SH',
          stockName: '贵州茅台',
          actualWeight: null,
          targetWeight: 0.1,
          weightDiff: null,
          driftType: 'MISSING_IN_PORTFOLIO',
        },
      ],
      industryItems: [{ industry: '食品饮料', actualWeight: 0.15, targetWeight: 0.1, diff: 0.05 }],
    });

    const request = { portfolioId: 'portfolio-1', strategyId: 'strategy-1', alertThreshold: 0.3 };
    const result = await detectDrift(request);

    expect(apiClient.post).toHaveBeenCalledWith('/api/portfolio/drift-detection', request);
    expect(result).toEqual({
      portfolioId: 'portfolio-1',
      strategyId: 'strategy-1',
      tradeDate: '20260808',
      overallDrift: 0.35,
      isAlerting: true,
      alertThreshold: 0.3,
      items: [
        {
          tsCode: '600519.SH',
          stockName: '贵州茅台',
          actualWeight: null,
          targetWeight: 0.1,
          weightDiff: null,
          driftType: 'MISSING_IN_PORTFOLIO',
        },
      ],
      industryDrift: [{ industry: '食品饮料', actualWeight: 0.15, targetWeight: 0.1, diff: 0.05 }],
    });
  });
});

describe('portfolio trade log API adapters', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps Prisma rows from createdAt and keeps the missing amount as null', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 20,
      items: [
        {
          id: 'log-1',
          portfolioId: 'portfolio-1',
          userId: 7,
          tsCode: '000001.SZ',
          stockName: null,
          action: 'BUY',
          quantity: 100,
          price: null,
          reason: 'MANUAL',
          detail: null,
          createdAt: '2026-08-10T04:30:00.000Z',
        },
      ],
    });

    const result = await queryTradeLog({ portfolioId: 'portfolio-1', page: 1, pageSize: 20 });

    expect(apiClient.post).toHaveBeenCalledWith('/api/portfolio/trade-log', {
      portfolioId: 'portfolio-1',
      page: 1,
      pageSize: 20,
    });
    expect(result.items[0]).toEqual({
      id: 'log-1',
      portfolioId: 'portfolio-1',
      tsCode: '000001.SZ',
      stockName: null,
      action: 'BUY',
      quantity: 100,
      price: null,
      amount: null,
      reason: 'MANUAL',
      createdAt: '2026-08-10T04:30:00.000Z',
    });
    expect(result.items[0]).not.toHaveProperty('tradeDate');
  });

  it('normalizes groupBy rows into count summaries without inventing amounts', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce([
      {
        action: 'BUY',
        reason: 'MANUAL',
        tsCode: '000001.SZ',
        stockName: null,
        _count: { id: 2 },
      },
      {
        action: 'BUY',
        reason: 'BACKTEST_IMPORT',
        tsCode: '600519.SH',
        stockName: '贵州茅台',
        _count: { id: 3 },
      },
      {
        action: 'SELL',
        reason: 'MANUAL',
        tsCode: '000001.SZ',
        stockName: '平安银行',
        _count: { id: 1 },
      },
    ]);

    const result = await tradeLogSummary({ portfolioId: 'portfolio-1' });

    expect(apiClient.post).toHaveBeenCalledWith('/api/portfolio/trade-log/summary', {
      portfolioId: 'portfolio-1',
    });
    expect(result).toEqual({
      portfolioId: 'portfolio-1',
      totalTrades: 6,
      totalBuyAmount: null,
      totalSellAmount: null,
      byAction: [
        { action: 'BUY', count: 5, totalAmount: null },
        { action: 'SELL', count: 1, totalAmount: null },
      ],
      byStock: [
        { tsCode: '000001.SZ', stockName: '平安银行', count: 3 },
        { tsCode: '600519.SH', stockName: '贵州茅台', count: 3 },
      ],
    });
  });
});
