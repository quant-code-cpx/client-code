import {
  fetchSentiment,
  fetchValuation,
  fetchIndexQuote,
  fetchIndexTrend,
  fetchMarketBreadth,
  fetchSectorRanking,
  fetchRotationDetail,
  fetchSentimentTrend,
  fetchValuationTrend,
  fetchVolumeOverview,
  fetchRotationOverview,
  fetchReturnComparison,
  fetchChangeDistribution,
} from '../market';

// Mock apiClient to verify correct endpoint and parameter passing.
vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

beforeEach(() => {
  vi.clearAllMocks();
});

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
    mockPost().mockResolvedValueOnce({
      tsCode: '000001.SH',
      name: '上证指数',
      period: '1m',
      data: [],
    });

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

describe('fetchMarketBreadth', () => {
  it('shares one in-flight market-breadth request for identical payloads', async () => {
    mockPost().mockResolvedValueOnce({
      tradeDate: '20260515',
      limitUp: 93,
      limitDown: 30,
      bigRise: 272,
      rise: 1544,
      flat: 95,
      fall: 3329,
      bigFall: 255,
      total: 5495,
    });

    await Promise.all([
      fetchMarketBreadth({ trade_date: '20260515' }),
      fetchMarketBreadth({ trade_date: '20260515' }),
    ]);

    expect(mockPost()).toHaveBeenCalledTimes(1);
    expect(mockPost()).toHaveBeenCalledWith('/api/market/market-breadth', {
      trade_date: '20260515',
    });
  });
});

// ----------------------------------------------------------------------

describe('fetchChangeDistribution', () => {
  it('calls /api/market/change-distribution', async () => {
    mockPost().mockResolvedValueOnce({
      tradeDate: '20240101',
      limitUp: 50,
      limitDown: 10,
      distribution: [],
    });

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

// ----------------------------------------------------------------------

describe('fetchRotationDetail', () => {
  it('maps return trend close/pctChange and top stock valuation fields from backend detail response', async () => {
    mockPost().mockResolvedValueOnce({
      industry: '半导体设备',
      tsCode: 'BK1326.DC',
      returnTrend: [
        { tradeDate: '20260514', close: 42000.12, pctChange: 1.23, cumulativeReturn: 0 },
        { tradeDate: '20260515', close: 44610.47, pctChange: 4.68, cumulativeReturn: 6.22 },
      ],
      flowTrend: [{ tradeDate: '20260515', netAmount: 781000000, cumulativeNet: 781000000 }],
      valuation: {
        peTtmMedian: null,
        pbMedian: null,
        peTtmPercentile1y: null,
        pbPercentile1y: null,
      },
      topStocks: [
        {
          tsCode: '002371.SZ',
          name: '北方华创',
          pctChg: 4.8901,
          peTtm: 76.9546,
          pb: 10.9202,
          totalMv: 42910090.8672,
        },
      ],
    });

    const result = await fetchRotationDetail({ industry: '半导体设备', days: 20 });

    expect(mockPost()).toHaveBeenCalledWith('/api/industry-rotation/detail', {
      industry: '半导体设备',
      days: 20,
    });
    expect(result.sectorName).toBe('半导体设备');
    expect(result.tradeDate).toBe('20260515');
    expect(result.returnTrend.at(-1)).toMatchObject({
      close: 44610.47,
      pctChange: 4.68,
      cumReturn: 6.22,
    });
    expect(result.flowTrend[0]).toMatchObject({
      netInflow: 781000000,
      cumulativeInflow: 781000000,
    });
    expect(result.topStocks[0]).toMatchObject({
      tsCode: '002371.SZ',
      name: '北方华创',
      pctChg: 4.8901,
      peTtm: 76.9546,
      pb: 10.9202,
      totalMv: 42910090.8672,
    });
  });
});

// ----------------------------------------------------------------------

describe('industry rotation request dedupe', () => {
  it('shares one in-flight return-comparison request for identical payloads', async () => {
    mockPost().mockResolvedValueOnce({
      tradeDate: '20260515',
      industries: [
        {
          tsCode: 'BK1326.DC',
          name: '半导体设备',
          returns: { 20: 34.04 },
          latestPctChange: 4.68,
          latestClose: 44610.47,
        },
      ],
    });

    await Promise.all([
      fetchRotationOverview({ period_days: 20 }),
      fetchReturnComparison({ periods: [20], sort_period: 20, order: 'desc' }),
    ]);

    expect(mockPost()).toHaveBeenCalledTimes(1);
    expect(mockPost()).toHaveBeenCalledWith('/api/industry-rotation/return-comparison', {
      order: 'desc',
      periods: [20],
      sort_period: 20,
    });
  });
});
