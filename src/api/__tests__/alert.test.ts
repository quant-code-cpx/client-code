import { apiClient } from '../client';
import { alertApi, fetchLimitList, fetchLimitSummary, fetchLimitNextDayPerf } from '../alert';

vi.mock('../client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('alertApi.getPriceRules', () => {
  it('extracts items from backend paginated price rule response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      total: 1,
      page: 1,
      pageSize: 100,
      items: [
        {
          id: 1,
          userId: 100,
          tsCode: '000001.SZ',
          stockName: '平安银行',
          watchlistId: null,
          portfolioId: null,
          sourceName: null,
          ruleType: 'PRICE_ABOVE',
          threshold: 12.3,
          memo: null,
          status: 'ACTIVE',
          triggerCount: 0,
          lastTriggeredAt: null,
          createdAt: '2026-05-17T00:00:00.000Z',
          updatedAt: '2026-05-17T00:00:00.000Z',
        },
      ],
    });

    const result = await alertApi.getPriceRules();

    expect(apiClient.post).toHaveBeenCalledWith('/api/alert/price-rules/list', {
      page: 1,
      pageSize: 100,
    });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ACTIVE');
  });

  it('keeps compatibility with legacy array response used by local mocks', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce([]);

    await expect(alertApi.getPriceRules()).resolves.toEqual([]);
  });
});

describe('limit alert APIs', () => {
  it('maps limit-list filter payload to backend camelCase DTO', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ items: [] });

    await fetchLimitList({
      trade_date: '20260522',
      limit_type: 'UP',
      min_consecutive: 2,
      industry: '证券',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/alert/limit-list', {
      tradeDate: '20260522',
      limitType: 'UP',
      minStreak: 2,
      industry: '证券',
    });
  });

  it('maps limit-summary payload to backend camelCase DTO', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce([]);

    await fetchLimitSummary({ trade_date: '20260522', range: 5 });

    expect(apiClient.post).toHaveBeenCalledWith('/api/alert/limit-summary', {
      tradeDate: '20260522',
      range: 5,
    });
  });

  it('normalizes next-day backend items into matrix rows', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      meta: { actualDate: '20260522', requestedDate: '20260522', isHoliday: false },
      nextTradeDate: '20260525',
      total: 4,
      avgPctChg: 2,
      upRatio: 0.6667,
      items: [
        {
          tsCode: '000001.SZ',
          stockName: '样本一',
          limitType: 'UP',
          close: 10,
          pctChg: 10,
          firstSealTime: null,
          lastSealTime: null,
          streakDays: 1,
          pctChgLimit: 10,
          nextClose: 11,
          nextPctChg: 10,
        },
        {
          tsCode: '000002.SZ',
          stockName: '样本二',
          limitType: 'UP',
          close: 10,
          pctChg: 10,
          firstSealTime: null,
          lastSealTime: null,
          streakDays: 1,
          pctChgLimit: 10,
          nextClose: 10.6,
          nextPctChg: 6,
        },
        {
          tsCode: '000003.SZ',
          stockName: '样本三',
          limitType: 'UP',
          close: 10,
          pctChg: 10,
          firstSealTime: null,
          lastSealTime: null,
          streakDays: 2,
          pctChgLimit: 10,
          nextClose: 9,
          nextPctChg: -10,
        },
        {
          tsCode: '000004.SZ',
          stockName: '样本四',
          limitType: 'UP',
          close: 10,
          pctChg: 10,
          firstSealTime: null,
          lastSealTime: null,
          streakDays: 2,
          pctChgLimit: 10,
          nextClose: null,
          nextPctChg: null,
        },
      ],
    });

    const result = await fetchLimitNextDayPerf({
      trade_date: '20260522',
      limit_type: 'UP',
      min_consecutive: 1,
    });

    expect(apiClient.post).toHaveBeenCalledWith('/api/alert/limit-next-day-perf', {
      tradeDate: '20260522',
      limitType: 'UP',
      minStreak: 1,
    });
    expect(result.baseDate).toBe('20260522');
    expect(result.nextTradeDate).toBe('20260525');
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      prevStreak: 1,
      total: 2,
      avgNextDayPct: 8,
      today: { LIMIT_UP: 1, ABOVE_5: 1 },
    });
    expect(result.rows[1]).toMatchObject({
      prevStreak: 2,
      total: 1,
      avgNextDayPct: -10,
      today: { LIMIT_DOWN: 1 },
    });
  });

  it('keeps compatibility with legacy matrix response', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      date: '20260525',
      rows: [
        {
          prevStreak: 1,
          total: 1,
          avgNextDayPct: 2,
          today: {
            IN_5: 1,
            ABOVE_5: 0,
            BELOW_0: 0,
            BELOW_5: 0,
            LIMIT_UP: 0,
            LIMIT_DOWN: 0,
          },
        },
      ],
    });

    await expect(fetchLimitNextDayPerf({ trade_date: '20260522' })).resolves.toMatchObject({
      date: '20260525',
      nextTradeDate: '20260525',
      rows: [{ prevStreak: 1, total: 1 }],
    });
  });
});
