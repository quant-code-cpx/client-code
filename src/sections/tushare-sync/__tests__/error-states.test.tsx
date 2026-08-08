import { screen, waitFor } from '@testing-library/react';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { renderWithProviders } from 'src/test/test-utils';

import { SyncLogTab } from '../sync-log-tab';
import { DataGapsPanel } from '../data-gaps-panel';
import { CacheStatsTab } from '../cache-stats-tab';
import { RetryQueueTab } from '../retry-queue-tab';
import { DataQualityTab } from '../data-quality-tab';
import { SyncStatusOverviewPanel } from '../sync-status-overview';

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ label }: { label: string }) => <input aria-label={label} />,
}));

vi.mock('src/contexts/sync-notification-context', () => ({
  useSyncNotification: () => ({ lastQualitySummary: null }),
}));

vi.mock('src/api/tushare-sync', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/tushare-sync')>();
  return {
    ...actual,
    tushareSyncApi: Object.fromEntries(
      Object.keys(actual.tushareSyncApi).map((key) => [key, vi.fn()])
    ),
  };
});

const api = tushareSyncApi as unknown as Record<string, ReturnType<typeof vi.fn>>;

describe('[OPS-B07] local request errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('overview keeps working while timeline shows its own retryable error', async () => {
    api.getSyncStatusOverview.mockResolvedValue({
      generatedAt: '2026-08-08T00:00:00.000Z',
      totalRows: 0,
      totalMissingDays: 0,
      categories: [],
    });
    api.getSyncLogs.mockRejectedValue(new Error('timeline down'));

    renderWithProviders(<SyncStatusOverviewPanel />);

    expect(await screen.findByText('timeline down')).toBeInTheDocument();
    expect(screen.getByText('整体健康')).toBeInTheDocument();
    expect(screen.queryByText('今日暂无同步记录。')).not.toBeInTheDocument();
  });

  it('sync logs expose summary and list errors instead of zero/empty results', async () => {
    api.getSyncLogsSummary.mockRejectedValue(new Error('summary down'));
    api.getSyncLogs.mockRejectedValue(new Error('logs down'));

    renderWithProviders(<SyncLogTab />);

    expect(await screen.findByText('summary down')).toBeInTheDocument();
    expect(await screen.findByText('logs down')).toBeInTheDocument();
    expect(screen.queryByText('暂无同步日志记录')).not.toBeInTheDocument();
  });

  it('quality requests expose block errors without replacing them with empty states', async () => {
    api.getQualityHealth.mockRejectedValue(new Error('health down'));
    api.getQualitySummary.mockRejectedValue(new Error('summary down'));
    api.getQualityReport.mockRejectedValue(new Error('report down'));
    api.getValidationLogs.mockRejectedValue(new Error('validation down'));
    api.getRepairQueueStatus.mockRejectedValue(new Error('repair down'));

    renderWithProviders(<DataQualityTab />);

    expect(await screen.findByText('health down')).toBeInTheDocument();
    expect(await screen.findByText('summary down')).toBeInTheDocument();
  });

  it('quality focus request expands the data-gap tools panel', async () => {
    api.getQualityHealth.mockResolvedValue({
      status: 'healthy',
      lastCheckAt: null,
      failCount: 0,
      exhaustedRepairs: 0,
    });
    api.getQualitySummary.mockResolvedValue({
      checkedAt: '2026-08-08T00:00:00.000Z',
      totalDataSets: 0,
      counts: { pass: 0, warn: 0, fail: 0 },
      failures: [],
      crossTableCounts: { pass: 0, warn: 0, fail: 0 },
      autoRepairTriggered: false,
      repairTaskCount: 0,
    });
    api.getQualityReport.mockResolvedValue([]);
    api.getValidationLogs.mockResolvedValue([]);
    api.getRepairQueueStatus.mockResolvedValue({
      pending: 0,
      retrying: 0,
      succeeded: 0,
      exhausted: 0,
    });

    renderWithProviders(<DataQualityTab focusPanel="tools" focusRequest={1} />);

    expect(await screen.findByRole('button', { name: '主动检查工具' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('cache and retry workbenches show request errors', async () => {
    api.getCacheStats.mockRejectedValue(new Error('cache down'));
    const cacheRender = renderWithProviders(<CacheStatsTab />);
    expect(await screen.findByText('cache down')).toBeInTheDocument();
    cacheRender.unmount();

    api.getRetryQueue.mockRejectedValue(new Error('retry down'));
    renderWithProviders(<RetryQueueTab />);
    expect(await screen.findByText('retry down')).toBeInTheDocument();
    expect(screen.queryByText(/重试队列为空/)).not.toBeInTheDocument();
  });

  it('data-gap query shows failure and never presents it as no gaps', async () => {
    api.getDataGaps.mockRejectedValue(new Error('gap down'));
    const { user } = renderWithProviders(<DataGapsPanel />);

    await user.click(screen.getByRole('button', { name: '查询缺失日期' }));

    await waitFor(() => expect(screen.getByText('gap down')).toBeInTheDocument());
    expect(screen.queryByText(/暂无缺失数据/)).not.toBeInTheDocument();
  });
});
