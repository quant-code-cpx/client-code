import { http, HttpResponse } from 'msw';

// ----------------------------------------------------------------------

export const handlers = [
  http.post('/api/auth/captcha', () =>
    HttpResponse.json({
      code: 0,
      data: { captchaId: 'cap-001', svgImage: '<svg>mock</svg>' },
    })
  ),

  http.post('/api/auth/login', () =>
    HttpResponse.json({ code: 0, data: { accessToken: 'mock-access-token' } })
  ),

  http.post('/api/auth/refresh', () =>
    HttpResponse.json({ code: 0, data: { accessToken: 'refreshed-token' } })
  ),

  http.post('/api/auth/logout', () => HttpResponse.json({ code: 0, data: null })),

  http.post('/api/stock/search', () =>
    HttpResponse.json({
      code: 0,
      data: {
        total: 2,
        items: [
          { tsCode: '000001.SZ', symbol: '000001', name: '平安银行', market: 'SZ', industry: '银行', listStatus: 'L' },
          { tsCode: '600036.SH', symbol: '600036', name: '招商银行', market: 'SH', industry: '银行', listStatus: 'L' },
        ],
      },
    })
  ),

  http.post('/api/stock/list', () =>
    HttpResponse.json({
      code: 0,
      data: {
        page: 1,
        pageSize: 20,
        total: 100,
        items: [],
      },
    })
  ),

  http.post('/api/market/index-quote', () =>
    HttpResponse.json({ code: 0, data: [] })
  ),

  http.post('/api/market/sentiment', () =>
    HttpResponse.json({
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
    })
  ),

  http.post('/api/market/volume-overview', () =>
    HttpResponse.json({ code: 0, data: { data: [] } })
  ),

  http.post('/api/backtests/runs', () =>
    HttpResponse.json({
      code: 0,
      data: {
        runId: 'run-001',
        jobId: 'job-001',
        status: 'QUEUED',
      },
    })
  ),

  http.post('/api/backtests/runs/list', () =>
    HttpResponse.json({
      code: 0,
      data: { page: 1, pageSize: 10, total: 0, items: [] },
    })
  ),

  http.post('/api/backtests/runs/detail', () =>
    HttpResponse.json({
      code: 0,
      data: {
        runId: 'run-001',
        jobId: 'job-001',
        status: 'COMPLETED',
        progress: 100,
      },
    })
  ),
];
