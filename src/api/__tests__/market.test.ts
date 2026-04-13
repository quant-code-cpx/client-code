import { http, HttpResponse } from 'msw';

import { server } from 'src/test/mocks/server';

import {
  fetchIndexQuote,
  fetchIndexTrend,
  fetchSentiment,
  fetchChangeDistribution,
  fetchSentimentTrend,
  fetchSectorRanking,
  fetchVolumeOverview,
  fetchValuation,
} from '../market';

// ----------------------------------------------------------------------

describe('fetchIndexQuote', () => {
  it('returns array of index quote items', async () => {
    server.use(
      http.post('/api/market/index-quote', () =>
        HttpResponse.json({
          code: 0,
          data: [
            {
              tsCode: '000001.SH',
              tradeDate: '20240101',
              close: 3000,
              preClose: 2990,
              change: 10,
              pctChg: 0.33,
              vol: 1000000,
              amount: 5000000,
            },
          ],
        })
      )
    );

    const result = await fetchIndexQuote({ trade_date: '20240101' });
    expect(result).toHaveLength(1);
    expect(result[0].tsCode).toBe('000001.SH');
  });

  it('sends trade_date in request body', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/market/index-quote', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ code: 0, data: [] });
      })
    );

    await fetchIndexQuote({ trade_date: '20240115' });
    expect((capturedBody as Record<string, unknown>).trade_date).toBe('20240115');
  });
});

// ----------------------------------------------------------------------

describe('fetchIndexTrend', () => {
  it('returns trend data with period and items', async () => {
    server.use(
      http.post('/api/market/index-trend', () =>
        HttpResponse.json({
          code: 0,
          data: {
            tsCode: '000300.SH',
            name: '沪深300',
            period: '1m',
            data: [{ tradeDate: '20240101', close: 3500, pctChg: 0.5, vol: 100, amount: 500 }],
          },
        })
      )
    );

    const result = await fetchIndexTrend({ ts_code: '000300.SH', period: '1m' });
    expect(result.tsCode).toBe('000300.SH');
    expect(result.period).toBe('1m');
    expect(result.data).toHaveLength(1);
  });
});

// ----------------------------------------------------------------------

describe('fetchSentiment', () => {
  it('returns sentiment totals', async () => {
    const result = await fetchSentiment();
    expect(result.total).toBe(5000);
    expect(result.bigRise).toBe(100);
  });

  it('sends trade_date when provided', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/market/sentiment', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          code: 0,
          data: {
            tradeDate: '20240101',
            total: 5000,
            bigRise: 100,
            rise: 1500,
            flat: 2000,
            fall: 1000,
            bigFall: 400,
          },
        });
      })
    );

    await fetchSentiment({ trade_date: '20240101' });
    expect((capturedBody as Record<string, unknown>).trade_date).toBe('20240101');
  });
});

// ----------------------------------------------------------------------

describe('fetchChangeDistribution', () => {
  it('returns distribution data', async () => {
    server.use(
      http.post('/api/market/change-distribution', () =>
        HttpResponse.json({
          code: 0,
          data: {
            tradeDate: '20240101',
            limitUp: 50,
            limitDown: 10,
            distribution: [{ label: '+5%以上', count: 100 }],
          },
        })
      )
    );

    const result = await fetchChangeDistribution({ trade_date: '20240101' });
    expect(result.limitUp).toBe(50);
    expect(result.distribution).toHaveLength(1);
  });
});

// ----------------------------------------------------------------------

describe('fetchSentimentTrend', () => {
  it('returns trend array', async () => {
    server.use(
      http.post('/api/market/sentiment-trend', () =>
        HttpResponse.json({
          code: 0,
          data: {
            data: [
              {
                tradeDate: '20240101',
                rise: 2000,
                flat: 1500,
                fall: 1000,
                limitUp: 50,
                limitDown: 10,
              },
            ],
          },
        })
      )
    );

    const result = await fetchSentimentTrend({ days: 30 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].tradeDate).toBe('20240101');
  });
});

// ----------------------------------------------------------------------

describe('fetchSectorRanking', () => {
  it('returns sector ranking list', async () => {
    server.use(
      http.post('/api/market/sector-ranking', () =>
        HttpResponse.json({
          code: 0,
          data: {
            tradeDate: '20240101',
            sectors: [
              {
                tsCode: 'BK0477.BK',
                name: '银行',
                pctChange: 1.5,
                netAmount: 100000000,
                netAmountRate: 0.5,
              },
            ],
          },
        })
      )
    );

    const result = await fetchSectorRanking({ trade_date: '20240101' });
    expect(result.tradeDate).toBe('20240101');
    expect(result.sectors).toHaveLength(1);
    expect(result.sectors[0].name).toBe('银行');
  });
});

// ----------------------------------------------------------------------

describe('fetchVolumeOverview', () => {
  it('returns volume overview data array', async () => {
    server.use(
      http.post('/api/market/volume-overview', () =>
        HttpResponse.json({
          code: 0,
          data: {
            data: [
              { tradeDate: '20240101', totalAmount: 900000000000, shAmount: 400000000000, szAmount: 500000000000 },
            ],
          },
        })
      )
    );

    const result = await fetchVolumeOverview({ days: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].totalAmount).toBe(900000000000);
  });
});

// ----------------------------------------------------------------------

describe('fetchValuation', () => {
  it('returns valuation with PE and PB data', async () => {
    server.use(
      http.post('/api/market/valuation', () =>
        HttpResponse.json({
          code: 0,
          data: {
            tradeDate: '20240101',
            peTtmMedian: 15.2,
            pbMedian: 1.3,
            peTtmPercentile: { oneYear: 0.6, threeYear: 0.55, fiveYear: 0.5 },
            pbPercentile: { oneYear: 0.4, threeYear: 0.45, fiveYear: 0.48 },
          },
        })
      )
    );

    const result = await fetchValuation({ trade_date: '20240101' });
    expect(result.peTtmMedian).toBe(15.2);
    expect(result.pbMedian).toBe(1.3);
    expect(result.peTtmPercentile.oneYear).toBe(0.6);
  });
});
