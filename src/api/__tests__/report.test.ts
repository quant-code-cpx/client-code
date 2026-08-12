import { apiClient } from '../client';
import { listSchedules, getReportDetail } from '../report';

import type {
  ReportSchedule,
  StockReportData,
  BacktestReportData,
  PortfolioReportData,
} from '../report';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

const schedule: ReportSchedule = {
  id: 'schedule-1',
  userId: 1,
  type: 'BACKTEST',
  title: '每日回测报告',
  params: {},
  format: 'PDF',
  frequency: 'DAILY',
  cronExpression: '0 18 * * 1-5',
  enabled: true,
  lastRunAt: null,
  nextRunAt: null,
  createdAt: '2026-07-11T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listSchedules', () => {
  it('extracts items from the backend list response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ items: [schedule], total: 1 });

    await expect(listSchedules()).resolves.toEqual([schedule]);
    expect(apiClient.post).toHaveBeenCalledWith('/api/report/schedules/list', {});
  });

  it('keeps compatibility with a legacy array response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce([schedule]);

    await expect(listSchedules()).resolves.toEqual([schedule]);
  });

  it('rejects an invalid response instead of passing it to the view', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ schedules: [] });

    await expect(listSchedules()).rejects.toThrow('定时报告列表响应格式错误');
  });
});

describe('getReportDetail data adapters', () => {
  it('normalizes the backend backtest report schema used by the viewer', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      ...baseReport,
      type: 'BACKTEST',
      data: {
        strategy: {
          name: '双均线',
          params: { fast: 5 },
          startDate: '2026-01-01',
          endDate: '2026-06-30',
          benchmark: '000300.SH',
          initialCapital: 1000000,
        },
        metrics: {
          totalReturn: 0.2,
          annualizedReturn: 0.12,
          benchmarkReturn: 0.08,
          excessReturn: 0.12,
          maxDrawdown: -0.1,
          sharpeRatio: 1.3,
          sortinoRatio: null,
          calmarRatio: 1.2,
          winRate: 0.55,
          tradeCount: 8,
          volatility: 0.18,
          alpha: 0.02,
          beta: 0.9,
        },
        navCurve: { dates: ['2026-01-02'], navValues: [1.02], benchmarkValues: [1.01] },
        drawdownCurve: { dates: ['2026-01-02'], values: [-0.01] },
        monthlyReturns: [{ year: 2026, month: 1, return: 0.02 }],
        trades: [
          {
            date: '2026-01-02',
            tsCode: '000001.SZ',
            side: 'BUY',
            price: 10,
            quantity: 100,
            amount: 1000,
          },
        ],
        endPositions: [
          { tsCode: '000001.SZ', quantity: 100, weight: 0.5, unrealizedPnl: 20 },
        ],
      },
    });

    const report = await getReportDetail({ reportId: 'report-1' });
    const data = report.data as unknown as BacktestReportData;

    expect(data.metrics.annualReturn).toBe(0.12);
    expect(data.metrics.sharpe).toBe(1.3);
    expect(data.metrics.profitLossRatio).toBeNull();
    expect(data.navCurve).toEqual([{ date: '2026-01-02', nav: 1.02 }]);
    expect(data.monthlyReturns).toEqual([{ month: '2026-01', return: 0.02 }]);
    expect(data.trades[0]).toEqual(expect.objectContaining({ direction: 'BUY', name: null }));
    expect(data.endPositions[0]).toEqual(
      expect.objectContaining({ avgCost: null, marketValue: null })
    );
  });

  it('normalizes backend portfolio cost/count fields without inventing unavailable values', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      ...baseReport,
      type: 'PORTFOLIO',
      data: {
        overview: {
          id: 'portfolio-1',
          name: '研究组合',
          description: null,
          totalMarketValue: 120000,
          totalCost: 100000,
          totalPnl: 20000,
          createdAt: '2026-01-01',
        },
        holdings: [
          {
            tsCode: '000001.SZ',
            name: '平安银行',
            quantity: 100,
            costPrice: 10,
            currentPrice: 12,
            marketValue: 1200,
            weight: 1,
            pnl: 200,
            pnlPct: 0.2,
          },
        ],
        industryDistribution: [{ industry: '银行', weight: 1, count: 1 }],
      },
    });

    const report = await getReportDetail({ reportId: 'report-2' });
    const data = report.data as unknown as PortfolioReportData;

    expect(data.overview).toEqual(
      expect.objectContaining({
        initialCash: null,
        unrealizedPnl: 20000,
        holdingCount: 1,
      })
    );
    expect(data.holdings[0]).toEqual(
      expect.objectContaining({ avgCost: 10, industry: null })
    );
    expect(data.industryDistribution[0]).toEqual({
      industry: '银行',
      stockCount: 1,
      totalMarketValue: null,
      weight: 1,
    });
  });

  it('normalizes the backend stock parallel arrays and preserves nullable fields', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      ...baseReport,
      type: 'STOCK',
      data: {
        overview: {
          tsCode: '000001.SZ',
          name: null,
          industry: '银行',
          listDate: '1991-04-03',
          area: null,
        },
        priceHistory: {
          dates: ['2026-01-02', '2026-01-05'],
          opens: [10, 10.5],
          highs: [10.8, 11],
          lows: [9.9, 10.2],
          closes: [10.6],
          volumes: [1000, 1200],
        },
        technicalIndicators: null,
        financialSummary: {
          periods: ['2025-12-31'],
          roe: [12.5],
          netProfitMargin: [null],
          revenueYoyGrowth: [8.2],
        },
        top10Holders: [{ holderName: null, holdAmount: null, holdRatio: 9.99 }],
        dividends: [
          { endDate: null, divProc: '实施', cashDivTax: null, stkDiv: 0.1 },
        ],
      },
    });

    const report = await getReportDetail({ reportId: 'report-stock' });
    const data = report.data as unknown as StockReportData;

    expect(data.overview).toEqual({
      tsCode: '000001.SZ',
      name: null,
      industry: '银行',
      listDate: '1991-04-03',
      area: null,
    });
    expect(data.priceHistory).toEqual([
      expect.objectContaining({ date: '2026-01-02', close: 10.6 }),
      expect.objectContaining({ date: '2026-01-05', close: null }),
    ]);
    expect(data.financialSummary[0]).toEqual({
      period: '2025-12-31',
      roe: 12.5,
      netProfitMargin: null,
      revenueYoyGrowth: 8.2,
    });
    expect(data.top10Holders[0]).toEqual({
      holderName: null,
      holdAmount: null,
      holdRatio: 9.99,
    });
    expect(data.dividends[0]).toEqual({
      endDate: null,
      divProc: '实施',
      cashDivTax: null,
      stkDiv: 0.1,
    });
  });
});

const baseReport = {
  id: 'report-1',
  userId: 1,
  title: '测试报告',
  params: {},
  filePath: null,
  format: 'JSON',
  status: 'COMPLETED',
  errorMessage: null,
  fileSize: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  completedAt: '2026-01-01T00:01:00.000Z',
} as const;
