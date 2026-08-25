import type { DataOperationsOverview } from 'src/api/tushare-sync';

import { useState } from 'react';
import { act, screen, waitFor } from '@testing-library/react';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { renderWithProviders } from 'src/test/test-utils';

import { SyncStatusOverviewPanel } from '../sync-status-overview';

function RefreshKeyHarness() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button onClick={() => setRefreshKey((key) => key + 1)}>触发概览刷新</button>
      <SyncStatusOverviewPanel refreshKey={refreshKey} />
    </>
  );
}

vi.mock('src/api/tushare-sync', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/tushare-sync')>();
  return {
    ...actual,
    tushareSyncApi: { ...actual.tushareSyncApi, getOperationsOverview: vi.fn() },
  };
});

const overviewFixture: DataOperationsOverview = {
  generatedAt: '2026-08-08T12:34:56+08:00',
  expectedTradeDate: '20260808',
  overallStatus: 'DEGRADED',
  coreReadiness: { ready: 4, total: 5, percentage: 80 },
  runtime: {
    status: 'RUNNING',
    runId: 'run-12345678',
    sequence: 3,
    trigger: 'schedule',
    mode: 'incremental',
    startedAt: '2026-08-08T18:30:00+08:00',
    updatedAt: '2026-08-08T18:31:00+08:00',
    heartbeatExpiresAt: '2026-08-08T18:33:00+08:00',
    completedTasks: 2,
    totalTasks: 5,
    percentage: 40,
    elapsedMs: 60000,
    estimatedRemainingMs: 90000,
    activeTasks: [
      {
        task: 'DAILY',
        label: '日线行情',
        category: 'market',
        completedItems: 4,
        totalItems: 10,
        percentage: 40,
        elapsedMs: 60000,
      },
    ],
    queue: { position: 0, total: 0 },
  },
  attention: [
    {
      type: 'LATE',
      severity: 'HIGH',
      title: 'MarginDetail · LATE',
      detail: '期望 20260808，当前 20260807',
      task: 'MARGIN_DETAIL',
      dataset: 'MARGIN_DETAIL',
    },
  ],
  freshness: [
    {
      dataset: 'MARGIN_DETAIL',
      displayName: 'MarginDetail',
      sourceTask: 'MARGIN_DETAIL',
      sourceModels: ['MarginDetail'],
      frequency: 'DAILY',
      criticality: 'CORE',
      expectedTradeDate: '20260808',
      dataThrough: '20260807',
      lagTradingDays: 1,
      status: 'LATE',
      reason: '期望 20260808，当前 20260807',
      schedule: '交易日盘后同步',
      slaDueAt: '2026-08-08T19:00:00+08:00',
      lastSuccessfulAt: '2026-08-07T18:40:00+08:00',
      lastAttemptAt: '2026-08-08T18:30:00+08:00',
      syncStatus: 'SUCCESS',
      qualityStatus: 'PASS',
      recommendedTool: null,
    },
  ],
  quality: { pass: 1, warn: 0, fail: 0, unknown: 0 },
  retryQueue: { pending: 1, retrying: 0, exhausted: 0 },
  recentRun: {
    task: 'DAILY',
    status: 'SUCCESS',
    startedAt: '2026-08-08T18:30:00+08:00',
    finishedAt: '2026-08-08T18:31:00+08:00',
    message: null,
  },
};

describe('SyncStatusOverviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tushareSyncApi.getOperationsOverview).mockResolvedValue(overviewFixture);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('优先展示核心日频就绪度与可恢复的当前任务', async () => {
    renderWithProviders(<SyncStatusOverviewPanel />);

    expect(await screen.findByText('核心日频就绪度')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('正在同步')).toBeInTheDocument();
    expect(screen.getByText('日线行情')).toBeInTheDocument();
  });

  it('按真实水位展示日频接口，并可进入对应日志', async () => {
    const onGoLogs = vi.fn();
    const { user } = renderWithProviders(<SyncStatusOverviewPanel onGoLogs={onGoLogs} />);

    expect(await screen.findByText('2026-08-07')).toBeInTheDocument();
    expect(screen.getAllByText('2026-08-08').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: '日志' }));
    expect(onGoLogs).toHaveBeenCalledWith({ task: 'MARGIN_DETAIL' });
  });

  it('后端返回同步不完整状态时不崩溃并展示对应语义', async () => {
    vi.mocked(tushareSyncApi.getOperationsOverview).mockResolvedValue({
      ...overviewFixture,
      freshness: [
        {
          ...overviewFixture.freshness[0],
          status: 'DEGRADED',
          reason: '最近同步存在失败分片',
        },
      ],
    });

    renderWithProviders(<SyncStatusOverviewPanel />);

    expect(await screen.findByText('同步不完整')).toBeInTheDocument();
  });

  it('收到未知新鲜度状态时降级展示未知而非崩溃', async () => {
    vi.mocked(tushareSyncApi.getOperationsOverview).mockResolvedValue({
      ...overviewFixture,
      freshness: [
        {
          ...overviewFixture.freshness[0],
          status: 'FUTURE_STATUS' as DataOperationsOverview['freshness'][number]['status'],
        },
      ],
    });

    renderWithProviders(<SyncStatusOverviewPanel />);

    expect(await screen.findByText('未知')).toBeInTheDocument();
  });

  it('不向用户暴露模型名和英文状态枚举，并解释异常影响', async () => {
    const onGoLogs = vi.fn();
    const { user } = renderWithProviders(<SyncStatusOverviewPanel onGoLogs={onGoLogs} />);

    expect((await screen.findAllByText('融资融券明细')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('已延迟').length).toBeGreaterThan(0);
    expect(screen.getByText('落后 1 个交易日 · 当前至 2026-08-07')).toBeInTheDocument();
    expect(screen.queryByText('MarginDetail · LATE')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看融资融券明细同步日志' }));
    expect(onGoLogs).toHaveBeenCalledWith({ task: 'MARGIN_DETAIL' });
  });

  it('refreshKey 变化时重新读取统一概览', async () => {
    const { user } = renderWithProviders(<RefreshKeyHarness />);
    await screen.findByText('核心日频就绪度');
    expect(tushareSyncApi.getOperationsOverview).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '触发概览刷新' }));
    await waitFor(() => expect(tushareSyncApi.getOperationsOverview).toHaveBeenCalledTimes(2));
  });

  it('运行中每 5 秒轮询，并在后端恢复空闲后停止', async () => {
    vi.useFakeTimers();
    vi.mocked(tushareSyncApi.getOperationsOverview)
      .mockResolvedValueOnce(overviewFixture)
      .mockResolvedValueOnce({
        ...overviewFixture,
        runtime: {
          ...overviewFixture.runtime,
          status: 'IDLE',
          runId: null,
          activeTasks: [],
        },
      });

    renderWithProviders(<SyncStatusOverviewPanel />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(tushareSyncApi.getOperationsOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(tushareSyncApi.getOperationsOverview).toHaveBeenCalledTimes(2);
    expect(screen.getByText('当前空闲')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(tushareSyncApi.getOperationsOverview).toHaveBeenCalledTimes(2);
  });
});
