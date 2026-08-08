import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';

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

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('src/api/tushare-sync', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('src/api/tushare-sync')>();
  return {
    ...actual,
    tushareSyncApi: {
      ...actual.tushareSyncApi,
      getSyncLogs: vi.fn(),
      getSyncStatusOverview: vi.fn(),
    },
  };
});

describe('SyncStatusOverviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tushareSyncApi.getSyncStatusOverview).mockResolvedValue({
      generatedAt: '2026-08-08T00:00:00.000Z',
      totalRows: 0,
      totalMissingDays: 0,
      categories: [],
    });
    vi.mocked(tushareSyncApi.getSyncLogs).mockResolvedValue({
      total: 1,
      page: 1,
      pageSize: 100,
      items: [
        {
          id: 7,
          task: 'DAILY',
          status: 'FAILED',
          tradeDate: '20260808',
          message: 'failed',
          payload: null,
          startedAt: '2026-08-08T09:30:00.000+08:00',
          finishedAt: '2026-08-08T09:31:00.000+08:00',
        },
      ],
    });
  });

  it('[OPS-B08] timeline row opens logs with task, status and date filters', async () => {
    const onGoLogs = vi.fn();
    const { user } = renderWithProviders(<SyncStatusOverviewPanel onGoLogs={onGoLogs} />);

    const task = await screen.findByText('DAILY');
    await user.click(task.closest('button')!);

    expect(onGoLogs).toHaveBeenCalledWith({
      task: 'DAILY',
      status: 'FAILED',
      startDate: '2026-08-08',
      endDate: '2026-08-08',
    });
  });

  it('[OPS-B02] initial load uses cache while page refresh bypasses it', async () => {
    const { user } = renderWithProviders(<RefreshKeyHarness />);
    await screen.findByText('整体健康');

    expect(tushareSyncApi.getSyncStatusOverview).toHaveBeenNthCalledWith(1, false);
    await user.click(screen.getByRole('button', { name: '触发概览刷新' }));

    await waitFor(() => {
      expect(tushareSyncApi.getSyncStatusOverview).toHaveBeenLastCalledWith(true);
    });
  });

  it('shows exact generatedAt time for the current or retained overview snapshot', async () => {
    vi.mocked(tushareSyncApi.getSyncStatusOverview).mockResolvedValueOnce({
      generatedAt: '2026-08-08T12:34:56',
      totalRows: 0,
      totalMissingDays: 0,
      categories: [],
    });

    renderWithProviders(<SyncStatusOverviewPanel />);

    expect(await screen.findByText(/最后快照：2026-08-08 12:34:56/)).toBeInTheDocument();
  });

  it('新鲜度清单优先展示异常分类，分类汇总始终展示全部分类', async () => {
    vi.mocked(tushareSyncApi.getSyncStatusOverview).mockResolvedValueOnce({
      generatedAt: '2026-08-08T00:00:00.000Z',
      totalRows: 0,
      totalMissingDays: 0,
      categories: [
        {
          name: '异常分类',
          rowCount: 0,
          items: [
            {
              tableName: 'FAILED_TASK',
              displayName: '失败任务',
              category: 'basic',
              rowCount: 0,
              minDate: null,
              maxDate: null,
              distinctDates: null,
              missingDays: null,
              lastSyncAt: '2026-08-05T12:00:00.000Z',
              lastStatus: 'FAILED',
              consecutiveFailures: 1,
            },
          ],
        },
        ...[1, 2, 3, 4, 5].map((index) => ({
          name: '正常分类 ' + index,
          rowCount: 0,
          items: [
            {
              tableName: 'NORMAL_' + index,
              displayName: '正常任务 ' + index,
              category: 'basic',
              rowCount: 0,
              minDate: null,
              maxDate: null,
              distinctDates: null,
              missingDays: null,
              lastSyncAt: '2026-08-08T12:00:00.000Z',
              lastStatus: 'SUCCESS' as const,
              consecutiveFailures: 0,
            },
          ],
        })),
      ],
    });

    const { user } = renderWithProviders(<SyncStatusOverviewPanel />);

    expect(await screen.findAllByText('异常分类')).toHaveLength(2);
    expect(screen.getAllByText('正常分类 4')).toHaveLength(2);
    expect(screen.getByText('正常分类 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '展开全部' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看全部 6 个分类' }));

    expect(screen.getAllByText('正常分类 5')).toHaveLength(2);
  });
});
