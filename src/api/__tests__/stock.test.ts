import { searchStocks, stockApi, stockDetailApi } from '../stock';

// Mock apiClient to verify correct endpoint and parameter passing.
vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

// eslint-disable-next-line import/first
import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

// ----------------------------------------------------------------------

describe('stockApi.list', () => {
  it('calls POST /api/stock/list with query params', async () => {
    mockPost().mockResolvedValueOnce({ page: 1, pageSize: 20, total: 100, items: [] });

    await stockApi.list({ page: 2, pageSize: 20, keyword: '招商' });

    expect(mockPost()).toHaveBeenCalledWith('/api/stock/list', {
      page: 2,
      pageSize: 20,
      keyword: '招商',
    });
  });

  it('forwards all filter parameters to the backend', async () => {
    mockPost().mockResolvedValueOnce({ page: 1, pageSize: 50, total: 0, items: [] });

    await stockApi.list({
      exchange: 'SSE',
      listStatus: 'L',
      industry: '银行',
      area: '广东',
      market: '主板',
      isHs: 'H',
      sortBy: 'totalMv',
      sortOrder: 'desc',
    });

    expect(mockPost()).toHaveBeenCalledWith('/api/stock/list', {
      exchange: 'SSE',
      listStatus: 'L',
      industry: '银行',
      area: '广东',
      market: '主板',
      isHs: 'H',
      sortBy: 'totalMv',
      sortOrder: 'desc',
    });
  });
});

// ----------------------------------------------------------------------

describe('stockDetailApi.overview', () => {
  it('sends { code } (not { tsCode }) as the parameter — matches backend DTO', async () => {
    mockPost().mockResolvedValueOnce({
      basic: null,
      company: null,
      latestQuote: null,
      latestValuation: null,
      latestExpress: null,
    });

    await stockDetailApi.overview('000001.SZ');

    expect(mockPost()).toHaveBeenCalledWith('/api/stock/detail/overview', { code: '000001.SZ' });
  });
});

// ----------------------------------------------------------------------

describe('stockDetailApi.chart', () => {
  it('sends all chart params to the backend', async () => {
    mockPost().mockResolvedValueOnce({ tsCode: '000001.SZ', period: 'D', adjustType: 'qfq', items: [] });

    await stockDetailApi.chart({
      tsCode: '000001.SZ',
      period: 'D',
      adjustType: 'qfq',
      startDate: '20240101',
      endDate: '20241231',
      limit: 200,
    });

    expect(mockPost()).toHaveBeenCalledWith('/api/stock/detail/chart', {
      tsCode: '000001.SZ',
      period: 'D',
      adjustType: 'qfq',
      startDate: '20240101',
      endDate: '20241231',
      limit: 200,
    });
  });
});

// ----------------------------------------------------------------------

describe('stockDetailApi.moneyFlow', () => {
  it('calls with tsCode and days', async () => {
    mockPost().mockResolvedValueOnce({ tsCode: '000001.SZ', summary: {}, items: [] });

    await stockDetailApi.moneyFlow('000001.SZ', 30);

    expect(mockPost()).toHaveBeenCalledWith('/api/stock/detail/money-flow', {
      tsCode: '000001.SZ',
      days: 30,
    });
  });
});

// ----------------------------------------------------------------------

describe('stockDetailApi.todayFlow', () => {
  it('sends { code: tsCode } — todayFlow uses "code" key, not "tsCode"', async () => {
    mockPost().mockResolvedValueOnce({ tsCode: '000001.SZ', tradeDate: '2024-01-01' });

    await stockDetailApi.todayFlow('000001.SZ');

    // IMPORTANT: todayFlow maps the parameter as { code: tsCode } per the DTO contract.
    expect(mockPost()).toHaveBeenCalledWith('/api/stock/detail/today-flow', { code: '000001.SZ' });
  });
});

// ----------------------------------------------------------------------

describe('searchStocks', () => {
  it('calls POST /api/stock/search with keyword and optional limit', async () => {
    mockPost().mockResolvedValueOnce([]);

    await searchStocks({ keyword: '平安', limit: 10 });

    expect(mockPost()).toHaveBeenCalledWith('/api/stock/search', { keyword: '平安', limit: 10 });
  });
});
