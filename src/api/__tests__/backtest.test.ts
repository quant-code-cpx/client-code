import {
  listRuns,
  cancelRun,
  createRun,
  validateRun,
  getRunDetail,
  getRunEquity,
  getRunTrades,
  getRunPositions,
  getRunRebalanceLogs,
  getStrategyTemplates,
} from '../backtest';

// Mock apiClient to verify correct endpoint and parameter passing.
vi.mock('src/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from 'src/api/client';

const mockPost = () => vi.mocked(apiClient.post);

// ----------------------------------------------------------------------

describe('getStrategyTemplates', () => {
  it('calls POST /api/backtests/strategy-templates with no body', async () => {
    mockPost().mockResolvedValueOnce({ templates: [] });

    await getStrategyTemplates();

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/strategy-templates');
  });
});

// ----------------------------------------------------------------------

describe('validateRun', () => {
  it('calls POST /api/backtests/runs/validate with full query', async () => {
    const query = {
      strategyType: 'MA_CROSS_SINGLE',
      strategyConfig: { fast: 5, slow: 20 },
      startDate: '20200101',
      endDate: '20231231',
      initialCapital: 1000000,
    };
    mockPost().mockResolvedValueOnce({
      isValid: true,
      warnings: [],
      errors: [],
      dataReadiness: {
        hasDaily: true,
        hasAdjFactor: true,
        hasTradeCal: true,
        hasIndexDaily: true,
        hasStkLimit: true,
        hasSuspendD: true,
        hasIndexWeight: true,
      },
      stats: {
        tradingDays: 0,
        estimatedUniverseSize: null,
        earliestAvailableDate: null,
        latestAvailableDate: null,
      },
    });

    await validateRun(query);

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/validate', query);
  });
});

// ----------------------------------------------------------------------

describe('createRun', () => {
  it('calls POST /api/backtests/runs with run configuration', async () => {
    const query = {
      name: 'test run',
      strategyType: 'MA_CROSS_SINGLE',
      strategyConfig: { fast: 5, slow: 20 },
      startDate: '20220101',
      endDate: '20231231',
      initialCapital: 1000000,
    };
    mockPost().mockResolvedValueOnce({ runId: 'run-1', jobId: 'job-1', status: 'QUEUED' });

    const result = await createRun(query);

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs', query);
    expect(result.status).toBe('QUEUED');
  });
});

// ----------------------------------------------------------------------

describe('listRuns', () => {
  it('calls POST /api/backtests/runs/list with pagination params', async () => {
    mockPost().mockResolvedValueOnce({ page: 1, pageSize: 20, total: 5, items: [] });

    await listRuns({ page: 1, pageSize: 20 });

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/list', { page: 1, pageSize: 20 });
  });

  it('forwards status and keyword filters', async () => {
    mockPost().mockResolvedValueOnce({ page: 1, pageSize: 20, total: 0, items: [] });

    await listRuns({ status: 'COMPLETED', keyword: 'ma cross' });

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/list', {
      status: 'COMPLETED',
      keyword: 'ma cross',
    });
  });
});

// ----------------------------------------------------------------------

describe('getRunDetail', () => {
  it('sends { runId } to /api/backtests/runs/detail', async () => {
    mockPost().mockResolvedValueOnce({ runId: 'run-abc', status: 'COMPLETED' });

    await getRunDetail('run-abc');

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/detail', { runId: 'run-abc' });
  });
});

// ----------------------------------------------------------------------

describe('getRunEquity', () => {
  it('sends { runId } to /api/backtests/runs/equity', async () => {
    mockPost().mockResolvedValueOnce({ points: [] });

    await getRunEquity('run-xyz');

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/equity', { runId: 'run-xyz' });
  });
});

// ----------------------------------------------------------------------

describe('getRunTrades', () => {
  it('sends runId, page, and pageSize — defaults page=1, pageSize=50', async () => {
    mockPost().mockResolvedValueOnce({ page: 1, pageSize: 50, total: 0, items: [] });

    await getRunTrades('run-abc');

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/trades', {
      runId: 'run-abc',
      page: 1,
      pageSize: 50,
    });
  });

  it('passes custom page and pageSize', async () => {
    mockPost().mockResolvedValueOnce({ page: 2, pageSize: 20, total: 100, items: [] });

    await getRunTrades('run-abc', 2, 20);

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/trades', {
      runId: 'run-abc',
      page: 2,
      pageSize: 20,
    });
  });
});

// ----------------------------------------------------------------------

describe('getRunPositions', () => {
  it('sends only { runId } when no tradeDate provided', async () => {
    mockPost().mockResolvedValueOnce({ tradeDate: '20240101', items: [] });

    await getRunPositions('run-abc');

    // No tradeDate key should be included in the request body
    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/positions', { runId: 'run-abc' });
  });

  it('includes tradeDate when explicitly provided', async () => {
    mockPost().mockResolvedValueOnce({ tradeDate: '20240315', items: [] });

    await getRunPositions('run-abc', '20240315');

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/positions', {
      runId: 'run-abc',
      tradeDate: '20240315',
    });
  });
});

// ----------------------------------------------------------------------

describe('getRunRebalanceLogs', () => {
  it('sends { runId } to /api/backtests/runs/rebalance-logs', async () => {
    mockPost().mockResolvedValueOnce({ items: [] });

    await getRunRebalanceLogs('run-abc');

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/rebalance-logs', {
      runId: 'run-abc',
    });
  });
});

// ----------------------------------------------------------------------

describe('cancelRun', () => {
  it('sends { runId } to /api/backtests/runs/cancel', async () => {
    mockPost().mockResolvedValueOnce({ runId: 'run-abc', status: 'CANCELLED' });

    const result = await cancelRun('run-abc');

    expect(mockPost()).toHaveBeenCalledWith('/api/backtests/runs/cancel', { runId: 'run-abc' });
    expect(result.status).toBe('CANCELLED');
  });
});
