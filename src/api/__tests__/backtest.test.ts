import { http, HttpResponse } from 'msw';

import { server } from 'src/test/mocks/server';

import { createRun, listRuns, getRunDetail, cancelRun } from '../backtest';

// ----------------------------------------------------------------------

describe('createRun', () => {
  it('sends run configuration and returns runId and status', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/backtests/runs', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          code: 0,
          data: { runId: 'run-abc', jobId: 'job-abc', status: 'QUEUED' },
        });
      })
    );

    const result = await createRun({
      strategyType: 'MA_CROSS_SINGLE',
      strategyConfig: { shortPeriod: 5, longPeriod: 20 },
      startDate: '20230101',
      endDate: '20231231',
      initialCapital: 1000000,
    });

    expect(result.runId).toBe('run-abc');
    expect(result.status).toBe('QUEUED');
    expect((capturedBody as Record<string, unknown>).strategyType).toBe('MA_CROSS_SINGLE');
    expect((capturedBody as Record<string, unknown>).initialCapital).toBe(1000000);
  });

  it('throws on validation error (400)', async () => {
    server.use(
      http.post('/api/backtests/runs', () =>
        HttpResponse.json({ message: '策略参数不合法' }, { status: 400 })
      )
    );

    await expect(
      createRun({
        strategyType: 'INVALID',
        strategyConfig: {},
        startDate: '20230101',
        endDate: '20231231',
        initialCapital: 0,
      })
    ).rejects.toThrow('策略参数不合法');
  });
});

// ----------------------------------------------------------------------

describe('listRuns', () => {
  it('returns paginated run list', async () => {
    server.use(
      http.post('/api/backtests/runs/list', () =>
        HttpResponse.json({
          code: 0,
          data: {
            page: 1,
            pageSize: 10,
            total: 3,
            items: [
              {
                runId: 'run-001',
                name: '测试回测',
                strategyType: 'MA_CROSS_SINGLE',
                status: 'COMPLETED',
                startDate: '20230101',
                endDate: '20231231',
                benchmarkTsCode: '000300.SH',
                totalReturn: 0.15,
                annualizedReturn: 0.14,
                maxDrawdown: -0.1,
                sharpeRatio: 1.2,
                progress: 100,
                createdAt: '2024-01-01T00:00:00.000Z',
                completedAt: '2024-01-02T00:00:00.000Z',
              },
            ],
          },
        })
      )
    );

    const result = await listRuns({ page: 1, pageSize: 10 });
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].runId).toBe('run-001');
    expect(result.items[0].status).toBe('COMPLETED');
  });

  it('sends status filter when provided', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/backtests/runs/list', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          code: 0,
          data: { page: 1, pageSize: 10, total: 0, items: [] },
        });
      })
    );

    await listRuns({ page: 1, pageSize: 10, status: 'RUNNING' });
    expect((capturedBody as Record<string, unknown>).status).toBe('RUNNING');
  });
});

// ----------------------------------------------------------------------

describe('getRunDetail', () => {
  it('returns run detail with summary metrics', async () => {
    server.use(
      http.post('/api/backtests/runs/detail', () =>
        HttpResponse.json({
          code: 0,
          data: {
            runId: 'run-001',
            jobId: 'job-001',
            name: '测试回测',
            status: 'COMPLETED',
            progress: 100,
            failedReason: null,
            strategyType: 'MA_CROSS_SINGLE',
            strategyConfig: {},
            startDate: '20230101',
            endDate: '20231231',
            benchmarkTsCode: '000300.SH',
            universe: 'HS300',
            initialCapital: 1000000,
            rebalanceFrequency: 'WEEKLY',
            priceMode: 'CLOSE',
            summary: {
              totalReturn: 0.15,
              annualizedReturn: 0.14,
              benchmarkReturn: 0.1,
              excessReturn: 0.05,
              maxDrawdown: -0.1,
              sharpeRatio: 1.2,
              sortinoRatio: 1.5,
              calmarRatio: 1.4,
              volatility: 0.12,
              alpha: 0.03,
              beta: 0.9,
              informationRatio: 0.8,
              winRate: 0.55,
              turnoverRate: 2.0,
              tradeCount: 120,
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            startedAt: '2024-01-01T00:01:00.000Z',
            completedAt: '2024-01-01T00:05:00.000Z',
          },
        })
      )
    );

    const result = await getRunDetail('run-001');
    expect(result.runId).toBe('run-001');
    expect(result.status).toBe('COMPLETED');
    expect(result.summary.totalReturn).toBe(0.15);
    expect(result.summary.sharpeRatio).toBe(1.2);
  });

  it('sends runId in request body', async () => {
    let capturedBody: unknown = null;

    server.use(
      http.post('/api/backtests/runs/detail', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({
          code: 0,
          data: { runId: 'run-xyz', status: 'QUEUED', progress: 0 },
        });
      })
    );

    await getRunDetail('run-xyz').catch(() => {});
    expect((capturedBody as Record<string, unknown>).runId).toBe('run-xyz');
  });
});

// ----------------------------------------------------------------------

describe('cancelRun', () => {
  it('cancels a run and returns CANCELLED status', async () => {
    server.use(
      http.post('/api/backtests/runs/cancel', () =>
        HttpResponse.json({
          code: 0,
          data: { runId: 'run-001', status: 'CANCELLED' },
        })
      )
    );

    const result = await cancelRun('run-001');
    expect(result.runId).toBe('run-001');
    expect(result.status).toBe('CANCELLED');
  });
});
