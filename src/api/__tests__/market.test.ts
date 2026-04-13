import {
  fetchChangeDistribution,
  fetchIndexQuote,
  fetchIndexTrend,
  fetchSectorRanking,
  fetchSentiment,
  fetchSentimentTrend,
  fetchValuation,
  fetchValuationTrend,
  fetchVolumeOverview,
} from '../market';

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

describe('fetchIndexQuote', () => {
  it('calls /api/market/index-quote with empty object when no params provided', async () => {
    mockPost().mockResolvedValueOnce([]);

    await fetchIndexQuote();

    expect(mockPost()).toHaveBeenCalledWith('/api/market/index-quote', {});
  });

  it('passes trade_date and ts_codes when provided', async () => {
    mockPost().mockResolvedValueOnce([]);

    await fetchIndexQuote({ trade_date: '20240101', ts_codes: ['000001.SH'] });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/index-quote', {
      trade_date: '20240101',
      ts_codes: ['000001.SH'],
    });
  });
});

// ----------------------------------------------------------------------

describe('fetchIndexTrend', () => {
  it('calls /api/market/index-trend with period and ts_code', async () => {
    mockPost().mockResolvedValueOnce({ tsCode: '000001.SH', name: '上证指数', period: '1m', data: [] });

    await fetchIndexTrend({ ts_code: '000001.SH', period: '1m' });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/index-trend', {
      ts_code: '000001.SH',
      period: '1m',
    });
  });

  it('sends empty object when called without params', async () => {
    mockPost().mockResolvedValueOnce({ tsCode: '000001.SH', name: '', period: '1m', data: [] });

    await fetchIndexTrend();

    expect(mockPost()).toHaveBeenCalledWith('/api/market/index-trend', {});
  });
});

// ----------------------------------------------------------------------

describe('fetchSentiment', () => {
  it('calls /api/market/sentiment with trade_date', async () => {
    mockPost().mockResolvedValueOnce({
      tradeDate: '20240101',
      total: 5000,
      bigRise: 100,
      rise: 2000,
      flat: 1000,
      fall: 1500,
      bigFall: 400,
    });

    await fetchSentiment({ trade_date: '20240101' });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/sentiment', { trade_date: '20240101' });
  });

  it('sends empty object when no trade_date specified (backend uses latest)', async () => {
    mockPost().mockResolvedValueOnce({});

    await fetchSentiment();

    expect(mockPost()).toHaveBeenCalledWith('/api/market/sentiment', {});
  });
});

// ----------------------------------------------------------------------

describe('fetchChangeDistribution', () => {
  it('calls /api/market/change-distribution', async () => {
    mockPost().mockResolvedValueOnce({ tradeDate: '20240101', limitUp: 50, limitDown: 10, distribution: [] });

    await fetchChangeDistribution({ trade_date: '20240101' });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/change-distribution', {
      trade_date: '20240101',
    });
  });
});

// ----------------------------------------------------------------------

describe('fetchSentimentTrend', () => {
  it('passes days parameter to the backend', async () => {
    mockPost().mockResolvedValueOnce({ data: [] });

    await fetchSentimentTrend({ days: 30 });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/sentiment-trend', { days: 30 });
  });
});

// ----------------------------------------------------------------------

describe('fetchSectorRanking', () => {
  it('passes sort_by and limit to the backend', async () => {
    mockPost().mockResolvedValueOnce({ tradeDate: '20240101', sectors: [] });

    await fetchSectorRanking({ sort_by: 'net_amount', limit: 20 });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/sector-ranking', {
      sort_by: 'net_amount',
      limit: 20,
    });
  });
});

// ----------------------------------------------------------------------

describe('fetchVolumeOverview', () => {
  it('calls /api/market/volume-overview with days param', async () => {
    mockPost().mockResolvedValueOnce({ data: [] });

    await fetchVolumeOverview({ days: 60 });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/volume-overview', { days: 60 });
  });
});

// ----------------------------------------------------------------------

describe('fetchValuation', () => {
  it('calls /api/market/valuation with trade_date', async () => {
    mockPost().mockResolvedValueOnce({
      tradeDate: '20240101',
      peTtmMedian: 20,
      pbMedian: 2,
      peTtmPercentile: { oneYear: 0.5, threeYear: 0.6, fiveYear: 0.7 },
      pbPercentile: { oneYear: 0.5, threeYear: 0.6, fiveYear: 0.7 },
    });

    await fetchValuation({ trade_date: '20240101' });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/valuation', { trade_date: '20240101' });
  });
});

// ----------------------------------------------------------------------

describe('fetchValuationTrend', () => {
  it('calls /api/market/valuation-trend with period', async () => {
    mockPost().mockResolvedValueOnce({ period: '1y', data: [] });

    await fetchValuationTrend({ period: '1y' });

    expect(mockPost()).toHaveBeenCalledWith('/api/market/valuation-trend', { period: '1y' });
  });

  it('sends empty object when no period provided', async () => {
    mockPost().mockResolvedValueOnce({ period: '1y', data: [] });

    await fetchValuationTrend();

    expect(mockPost()).toHaveBeenCalledWith('/api/market/valuation-trend', {});
  });
});
