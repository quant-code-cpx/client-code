/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { BacktestRunListItem } from 'src/api/backtest';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { listRuns, cancelRun, getRunDetail } from 'src/api/backtest';

import { BacktestRunListView } from '../view/backtest-run-list-view';

const routerPush = vi.hoisted(() => vi.fn());

vi.mock('src/api/backtest', () => ({
  listRuns: vi.fn(),
  cancelRun: vi.fn(),
  getRunDetail: vi.fn(),
}));
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/sections/backtest/hooks/use-backtest-run-ws', () => ({
  useBacktestRunWs: () => undefined,
}));
vi.mock('src/sections/backtest/hooks/use-backtest-run-list-state', () => ({
  isInvalidDateRange: () => false,
  toRunListQuery: () => ({ page: 1, pageSize: 20, archived: false }),
  useBacktestRunListState: () => ({
    state: {
      filter: {},
      page: 0,
      pageSize: 20,
      sort: { field: 'createdAt', order: 'desc' },
      highlightRunId: undefined,
    },
    setFilter: vi.fn(),
    setPage: vi.fn(),
    setPageSize: vi.fn(),
    setSort: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));
vi.mock('src/sections/backtest/backtest-run-list-kpi-bar', () => ({
  BacktestRunListKpiBar: ({ loading, total }: { loading: boolean; total: number }) => (
    <div>{loading ? 'KPI 加载中' : `KPI 总数 ${total}`}</div>
  ),
}));
vi.mock('src/sections/backtest/backtest-run-list-toolbar', () => ({
  BacktestRunListToolbar: ({ onRefresh }: { onRefresh: () => void }) => (
    <button type="button" onClick={onRefresh}>刷新列表</button>
  ),
}));
vi.mock('src/sections/backtest/backtest-run-list-bulk-bar', () => ({
  BacktestRunListBulkBar: ({
    selectedCount,
    onAddComparison,
  }: {
    selectedCount: number;
    onAddComparison: () => void;
  }) => (
    <div>
      <span>已选 {selectedCount}</span>
      <button type="button" onClick={onAddComparison}>加入对比</button>
    </div>
  ),
}));
vi.mock('src/sections/backtest/backtest-run-list-table', () => ({
  BacktestRunListTable: ({
    items,
    loading,
    onCopy,
    onCancel,
    onToggleSelect,
  }: {
    items: BacktestRunListItem[];
    loading: boolean;
    onCopy: (item: BacktestRunListItem) => void;
    onCancel: (item: BacktestRunListItem) => void;
    onToggleSelect: (id: string) => void;
  }) => (
    <div>
      {loading ? <span>列表加载中</span> : null}
      {!loading && items.length === 0 ? <span>暂无回测任务</span> : null}
      {items.map((item) => (
        <div key={item.runId}>
          <span>{item.name} {item.status}</span>
          <button type="button" onClick={() => onToggleSelect(item.runId)}>选择 {item.name}</button>
          <button type="button" onClick={() => onCopy(item)}>复制 {item.name}</button>
          <button type="button" onClick={() => onCancel(item)}>取消 {item.name}</button>
        </div>
      ))}
    </div>
  ),
}));

describe('BacktestRunListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('首屏展示 loading，完成后透传准确 POST Body 与列表结果', async () => {
    const pending = deferred<ReturnType<typeof runListResponse>>();
    vi.mocked(listRuns).mockReturnValue(pending.promise);

    renderWithProviders(<BacktestRunListView />);

    expect(screen.getByText('列表加载中')).toBeInTheDocument();
    expect(listRuns).toHaveBeenCalledWith({ page: 1, pageSize: 20, archived: false });

    pending.resolve(runListResponse());

    expect(await screen.findByText('测试回测 RUNNING')).toBeInTheDocument();
    expect(screen.getByText('KPI 总数 1')).toBeInTheDocument();
  });

  it('请求失败支持局部重试并清除错误', async () => {
    vi.mocked(listRuns)
      .mockRejectedValueOnce(new Error('列表服务不可用'))
      .mockResolvedValueOnce(runListResponse([]));

    const { user } = renderWithProviders(<BacktestRunListView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('列表服务不可用');
    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('暂无回测任务')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(listRuns).toHaveBeenCalledTimes(2);
  });

  it('复制、取消和批量对比动作保持参数及导航状态', async () => {
    const item = runItem();
    vi.mocked(listRuns).mockResolvedValue(runListResponse());
    vi.mocked(getRunDetail).mockResolvedValue({
      ...item,
      strategyConfig: { fast: 5, slow: 20 },
      universe: 'HS300',
      initialCapital: 1_000_000,
      rebalanceFrequency: 'MONTHLY',
      priceMode: 'NEXT_OPEN',
    } as never);
    vi.mocked(cancelRun).mockResolvedValue({ runId: item.runId, status: 'CANCELLED' });

    const { user } = renderWithProviders(<BacktestRunListView />);
    await screen.findByText('测试回测 RUNNING');

    await user.click(screen.getByRole('button', { name: '复制 测试回测' }));
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(
        '/backtest',
        expect.objectContaining({
          state: expect.objectContaining({
            templateId: 'MA_CROSS_SINGLE',
            name: '测试回测（复制）',
            strategyConfig: { fast: 5, slow: 20 },
          }),
        })
      )
    );

    await user.click(screen.getByRole('button', { name: '取消 测试回测' }));
    expect(cancelRun).toHaveBeenCalledWith('run-1');
    expect(await screen.findByText('任务已取消')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '选择 测试回测' }));
    expect(screen.getByText('已选 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '加入对比' }));
    expect(routerPush).toHaveBeenCalledWith('/backtest/comparison/create', {
      state: { sourceRunIds: ['run-1'] },
    });
  });
});

function runListResponse(items = [runItem()]) {
  return { page: 1, pageSize: 20, total: items.length, items };
}

function runItem(): BacktestRunListItem {
  return {
    runId: 'run-1',
    jobId: 'job-1',
    name: '测试回测',
    strategyType: 'MA_CROSS_SINGLE',
    status: 'RUNNING',
    startDate: '20250101',
    endDate: '20251231',
    benchmarkTsCode: '000300.SH',
    totalReturn: null,
    annualizedReturn: null,
    maxDrawdown: null,
    sharpeRatio: null,
    progress: 30,
    createdAt: '2026-08-13T00:00:00.000Z',
    completedAt: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
