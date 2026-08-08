import { useState, StrictMode } from 'react';
import { act, screen, within, waitFor } from '@testing-library/react';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { renderWithProviders } from 'src/test/test-utils';

import { SyncPlanTab } from '../sync-plan-tab';

vi.mock('src/contexts/sync-notification-context', () => ({
  useSyncNotification: () => ({
    isSyncing: false,
    lastSyncError: null,
    lastSyncResult: null,
    clearLastResult: vi.fn(),
  }),
}));

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
      getPlans: vi.fn(),
      manualSync: vi.fn(),
      getSyncLogsSummary: vi.fn(),
    },
  };
});

const mockGetPlans = vi.mocked(tushareSyncApi.getPlans);
const mockGetSyncLogsSummary = vi.mocked(tushareSyncApi.getSyncLogsSummary);
const mockManualSync = vi.mocked(tushareSyncApi.manualSync);

describe('SyncPlanTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlans.mockResolvedValue([
      {
        task: 'STOCK_BASIC',
        label: '股票列表',
        category: 'basic',
        schedule: null,
        bootstrapEnabled: true,
        supportsManual: true,
        supportsFullSync: true,
        requiresTradeDate: false,
      },
      {
        task: 'TRADE_CAL',
        label: '交易日历',
        category: 'basic',
        schedule: null,
        bootstrapEnabled: true,
        supportsManual: true,
        supportsFullSync: true,
        requiresTradeDate: false,
      },
    ]);
    mockGetSyncLogsSummary.mockResolvedValue([
      {
        task: 'TRADE_CAL',
        lastStatus: 'FAILED',
        lastSyncAt: '2026-06-25T15:00:00.000Z',
        lastRowCount: null,
        consecutiveFailures: 1,
      },
    ]);
    mockManualSync.mockResolvedValue({ message: '同步任务已提交' });
  });

  it('统一调度 toolbar 操作控件使用 small theme baseline，避免尺寸混用和错位', async () => {
    renderWithProviders(<SyncPlanTab />);

    await screen.findByText('股票列表');

    const controls = [
      screen.getByRole('button', { name: '增量同步' }),
      screen.getByRole('button', { name: '全量同步' }),
      screen.getByRole('button', { name: '同步基础数据' }),
      screen.getByRole('button', { name: '补最近失败' }),
      screen.getByRole('button', { name: /开始同步/ }),
    ];

    expect(
      controls.slice(0, 2).every((control) => control.classList.contains('MuiToggleButton-sizeSmall'))
    ).toBe(true);
    expect(
      controls.slice(2).every((control) => control.classList.contains('MuiButton-sizeSmall'))
    ).toBe(true);
  });

  it('初次仅展示并默认全选 supportsManual 任务，默认使用全局增量模式', async () => {
    mockGetPlans.mockResolvedValueOnce([
      ...(await mockGetPlans()),
      {
        task: 'HIDDEN_TASK',
        label: '不可手动任务',
        category: 'basic',
        schedule: null,
        bootstrapEnabled: true,
        supportsManual: false,
        supportsFullSync: true,
        requiresTradeDate: false,
      },
    ]);

    renderWithProviders(<SyncPlanTab />);

    expect(
      await screen.findByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '已选 2 / 2 个任务'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('不可手动任务')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '增量同步' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('首次成功响应为空时，任务随后到达仍执行一次默认全选', async () => {
    mockGetPlans.mockResolvedValueOnce([]);

    function Harness() {
      const [refreshKey, setRefreshKey] = useState(0);
      return (
        <>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)}>
            刷新计划
          </button>
          <SyncPlanTab refreshKey={refreshKey} />
        </>
      );
    }

    const { user } = renderWithProviders(<Harness />);
    await waitFor(() => expect(mockGetPlans).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: '刷新计划' }));

    expect(
      await screen.findByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '已选 2 / 2 个任务'
      )
    ).toBeInTheDocument();
  });

  it('StrictMode 双调用 state updater 时仍保持默认全选', async () => {
    renderWithProviders(
      <StrictMode>
        <SyncPlanTab />
      </StrictMode>
    );

    expect(
      await screen.findByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '已选 2 / 2 个任务'
      )
    ).toBeInTheDocument();
  });

  it('[OPS-B05] 任务名称组内稳定排序，选择状态仍绑定 task key', async () => {
    mockGetPlans.mockResolvedValueOnce([
      {
        task: 'B_TASK',
        label: 'B task',
        category: 'basic',
        schedule: null,
        bootstrapEnabled: true,
        supportsManual: true,
        supportsFullSync: true,
        requiresTradeDate: false,
      },
      {
        task: 'A_TASK',
        label: 'A task',
        category: 'basic',
        schedule: null,
        bootstrapEnabled: true,
        supportsManual: true,
        supportsFullSync: true,
        requiresTradeDate: false,
      },
    ]);
    mockGetSyncLogsSummary.mockResolvedValueOnce([]);

    const { user } = renderWithProviders(<SyncPlanTab />);
    const bTask = await screen.findByText('B task');
    const bRow = bTask.closest('tr');
    expect(bRow).not.toBeNull();
    await user.click(within(bRow!).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: '任务名称' }));

    const aRow = screen.getByText('A task').closest('tr')!;
    const sortedBRow = screen.getByText('B task').closest('tr')!;
    const sortedTaskRows = Array.from(aRow.parentElement!.children).filter((row) =>
      row.textContent?.includes('task')
    );
    expect(sortedTaskRows.indexOf(aRow)).toBeLessThan(sortedTaskRows.indexOf(sortedBRow));
    expect(within(screen.getByText('B task').closest('tr')!).getByRole('checkbox')).not.toBeChecked();
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '已选 1 / 2 个任务'
      )
    ).toBeInTheDocument();
  });

  it('[OPS-B05] 只有可排序数据列暴露排序按钮', async () => {
    renderWithProviders(<SyncPlanTab />);
    await screen.findByText('股票列表');

    expect(screen.getByRole('button', { name: '任务名称' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '定时计划' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '分类' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '支持全量' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '操作' })).not.toBeInTheDocument();
  });

  it('两个直接同步捷径固定使用增量模式且不改变当前选择', async () => {
    const { user } = renderWithProviders(<SyncPlanTab />);
    await screen.findByText('股票列表');

    await user.click(screen.getByRole('button', { name: '同步基础数据' }));
    expect(mockManualSync).toHaveBeenLastCalledWith('incremental', ['STOCK_BASIC', 'TRADE_CAL']);

    await user.click(screen.getByRole('button', { name: '补最近失败' }));
    expect(mockManualSync).toHaveBeenLastCalledWith('incremental', ['TRADE_CAL']);
    expect(
      screen.getByText(
        (_, element) => element?.tagName === 'P' && element.textContent === '已选 2 / 2 个任务'
      )
    ).toBeInTheDocument();
  });

  it('开始同步与行内立即同步使用当前全局模式和 task key', async () => {
    const { user } = renderWithProviders(<SyncPlanTab />);
    const stockRow = (await screen.findByText('股票列表')).closest('tr')!;

    await user.click(within(stockRow).getByRole('button', { name: '立即同步' }));
    expect(mockManualSync).toHaveBeenLastCalledWith('incremental', ['STOCK_BASIC']);

    await user.click(screen.getByRole('button', { name: /开始同步/ }));
    expect(mockManualSync).toHaveBeenLastCalledWith('incremental', ['STOCK_BASIC', 'TRADE_CAL']);
  });

  it('全量同步必须准确输入“全量”，202 仅显示已提交语义', async () => {
    const { user } = renderWithProviders(<SyncPlanTab />);
    await screen.findByText('股票列表');

    await user.click(screen.getByRole('button', { name: '全量同步' }));
    await user.click(screen.getByRole('button', { name: /开始同步/ }));
    const confirm = screen.getByRole('button', { name: '确认全量同步' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: '确认文本' }), '全量');
    await user.click(confirm);

    expect(mockManualSync).toHaveBeenLastCalledWith('full', ['STOCK_BASIC', 'TRADE_CAL']);
    expect(await screen.findByText(/任务仅完成提交，最终结果以 WebSocket 通知或同步日志为准/)).toBeInTheDocument();
    expect(screen.queryByText(/同步完成/)).not.toBeInTheDocument();
  });

  it('本地请求进行中锁住所有同步入口，避免普通同步重复提交', async () => {
    let resolveSubmission: ((value: { message: string }) => void) | undefined;
    mockManualSync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve;
        })
    );

    const { user } = renderWithProviders(<SyncPlanTab />);
    const stockRow = (await screen.findByText('股票列表')).closest('tr')!;
    const immediateSync = within(stockRow).getByRole('button', { name: '立即同步' });
    const startSync = screen.getByRole('button', { name: '开始同步' });

    await user.click(immediateSync);

    expect(mockManualSync).toHaveBeenCalledTimes(1);
    expect(immediateSync).toBeDisabled();
    expect(startSync).toBeDisabled();
    expect(screen.getByRole('button', { name: '同步基础数据' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '补最近失败' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '全量同步' })).toBeDisabled();
    expect(mockManualSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSubmission?.({ message: '同步任务已提交' });
    });

    await waitFor(() => expect(startSync).not.toBeDisabled());
  });
});
