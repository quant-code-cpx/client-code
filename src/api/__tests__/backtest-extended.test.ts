import {
  starRun,
  retryRun,
  deleteRun,
  renameRun,
  archiveRun,
  getRunStats,
  runMonteCarlo,
  runAttribution,
  listComparisons,
  createComparison,
  getComparisonDetail,
  getComparisonEquity,
  listWalkForwardRuns,
  createWalkForwardRun,
  getWalkForwardEquity,
  cancelWalkForwardRun,
  deleteWalkForwardRun,
  createRollingBacktest,
  analyzeCostSensitivity,
  createParamSensitivity,
  getWalkForwardRunDetail,
  getParamSensitivityResult,
} from '../backtest';

vi.mock('src/api/client', () => ({ apiClient: { post: vi.fn() } }));

import { apiClient } from 'src/api/client';

const post = () => vi.mocked(apiClient.post);

describe('backtest extended API contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    post().mockResolvedValue({});
  });

  it('run 管理动作始终使用 POST body，不把 runId 放 path/query', async () => {
    await getRunStats({ status: 'FAILED', page: 2 });
    await renameRun({ runId: 'r1', name: '新名称' });
    await deleteRun({ runId: 'r1', hard: false });
    await archiveRun({ runId: 'r1', archived: true });
    await starRun({ runId: 'r1', starred: true });
    await retryRun({ runId: 'r1' });

    expect(post().mock.calls).toEqual([
      ['/api/backtests/runs/stats', { status: 'FAILED', page: 2 }],
      ['/api/backtests/runs/rename', { runId: 'r1', name: '新名称' }],
      ['/api/backtests/runs/delete', { runId: 'r1', hard: false }],
      ['/api/backtests/runs/archive', { runId: 'r1', archived: true }],
      ['/api/backtests/runs/star', { runId: 'r1', starred: true }],
      ['/api/backtests/runs/retry', { runId: 'r1' }],
    ]);
  });

  it('Walk-Forward 与滚动回测端点保持资源 ID 在 body', async () => {
    const create = { baseStrategyType: 'FACTOR_RANKING', initialCapital: 1_000_000 } as never;
    await createWalkForwardRun(create);
    await listWalkForwardRuns({ page: 1, pageSize: 20 });
    await getWalkForwardRunDetail('wf-1');
    await getWalkForwardEquity('wf-1');
    await cancelWalkForwardRun('wf-1');
    await deleteWalkForwardRun('wf-1');
    await createRollingBacktest({ strategyType: 'FACTOR_RANKING' } as never);

    expect(post().mock.calls).toEqual([
      ['/api/backtests/walk-forward/runs', create],
      ['/api/backtests/walk-forward/runs/list', { page: 1, pageSize: 20 }],
      ['/api/backtests/walk-forward/runs/detail', { wfRunId: 'wf-1' }],
      ['/api/backtests/walk-forward/runs/equity', { wfRunId: 'wf-1' }],
      ['/api/backtests/walk-forward/runs/cancel', { wfRunId: 'wf-1' }],
      ['/api/backtests/walk-forward/runs/delete', { wfRunId: 'wf-1' }],
      ['/api/backtests/rolling/runs', { strategyType: 'FACTOR_RANKING' }],
    ]);
  });

  it('comparison 与高级分析 API 透传完整参数', async () => {
    await createComparison({ name: 'A/B' } as never);
    await listComparisons({ page: 2, pageSize: 12, status: 'COMPLETED' });
    await getComparisonDetail('cmp-1');
    await getComparisonEquity('cmp-1', { mode: 'EXCESS', maxPoints: 500 });
    await runAttribution({ runId: 'r1', industryLevel: 'L1' });
    await createParamSensitivity({ runId: 'r1' } as never);
    await getParamSensitivityResult('sweep-1');
    await runMonteCarlo({ runId: 'r1', numSimulations: 500, seed: 7 });

    expect(post().mock.calls).toEqual([
      ['/api/backtests/comparisons', { name: 'A/B' }],
      ['/api/backtests/comparisons/list', { page: 2, pageSize: 12, status: 'COMPLETED' }],
      ['/api/backtests/comparisons/detail', { groupId: 'cmp-1' }],
      ['/api/backtests/comparisons/equity', { groupId: 'cmp-1', mode: 'EXCESS', maxPoints: 500 }],
      ['/api/backtests/runs/attribution', { runId: 'r1', industryLevel: 'L1' }],
      ['/api/backtests/runs/param-sensitivity', { runId: 'r1' }],
      ['/api/backtests/runs/param-sensitivity/result', { sweepId: 'sweep-1' }],
      ['/api/backtests/runs/monte-carlo', { runId: 'r1', numSimulations: 500, seed: 7 }],
    ]);
  });

  it('成本敏感性适配器保留 null，不伪造收益和风险指标', async () => {
    post().mockResolvedValue({
      runId: 'r1',
      originalCommissionRate: 0.0003,
      originalSlippageBps: 5,
      baselineTotalReturn: 0.25,
      points: [
        {
          commissionRate: 0.0005,
          slippageBps: 10,
          totalReturn: null,
          annualizedReturn: null,
          sharpeRatio: null,
          maxDrawdown: null,
          totalCost: null,
          costCapitalRatio: null,
        },
      ],
    });

    const result = await analyzeCostSensitivity({ runId: 'r1' });

    expect(post()).toHaveBeenCalledWith('/api/backtests/runs/cost-sensitivity', { runId: 'r1' });
    expect(result).toEqual({
      runId: 'r1',
      baselineMetrics: { commissionRate: 0.0003, slippageBps: 5, totalReturn: 0.25 },
      results: [
        {
          commissionRate: 0.0005,
          stampDutyRate: 0,
          slippageBps: 10,
          totalReturn: null,
          annualizedReturn: null,
          sharpeRatio: null,
          maxDrawdown: null,
          totalCost: null,
        },
      ],
    });
  });
});
