import { http, HttpResponse } from 'msw';

import { server } from 'src/test/mocks/server';

import { stockApi } from '../stock';

// ----------------------------------------------------------------------

describe('stockApi.list', () => {
  it('sends pagination params and returns paged result', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/stock/list', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          code: 0,
          data: {
            page: 2,
            pageSize: 10,
            total: 50,
            items: [{ tsCode: '000001.SZ', name: '平安银行' }],
          },
        });
      })
    );

    const result = await stockApi.list({ page: 2, pageSize: 10 });

    expect(capturedBody).toEqual({ page: 2, pageSize: 10 });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(50);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].tsCode).toBe('000001.SZ');
  });

  it('sends keyword filter when provided', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/stock/list', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          code: 0,
          data: { page: 1, pageSize: 20, total: 0, items: [] },
        });
      })
    );

    await stockApi.list({ page: 1, pageSize: 20, keyword: '平安' });
    expect(capturedBody).toEqual({ page: 1, pageSize: 20, keyword: '平安' });
  });

  it('sends exchange and listStatus filters when provided', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/stock/list', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          code: 0,
          data: { page: 1, pageSize: 20, total: 0, items: [] },
        });
      })
    );

    await stockApi.list({ page: 1, pageSize: 20, exchange: 'SSE', listStatus: 'L' });
    expect(capturedBody).toEqual({ page: 1, pageSize: 20, exchange: 'SSE', listStatus: 'L' });
  });

  it('throws on API error', async () => {
    server.use(
      http.post('/api/stock/list', () =>
        HttpResponse.json({ message: '服务异常' }, { status: 500 })
      )
    );

    await expect(stockApi.list({ page: 1, pageSize: 20 })).rejects.toThrow('服务异常');
  });
});
