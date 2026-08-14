/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type {
  ComparisonListItem,
  ComparisonMetricsRow,
  ComparisonGroupDetail,
} from 'src/api/backtest';

import { vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import {
  listComparisons,
  getComparisonDetail,
  getComparisonEquity,
} from 'src/api/backtest';

import { ComparisonListView } from '../view/comparison-list-view';
import { ComparisonDetailView } from '../view/comparison-detail-view';

const routerPush = vi.hoisted(() => vi.fn());
const routeState = vi.hoisted(() => ({ groupId: 'group-1' }));
const jobState = vi.hoisted(() => ({
  jobId: undefined as string | undefined,
  options: undefined as
    | { onProgress: () => void; onCompleted: () => void; onFailed: () => void }
    | undefined,
}));
const chartCalls = vi.hoisted(() => ({ props: [] as unknown[] }));

vi.mock('src/api/backtest', () => ({
  listComparisons: vi.fn(),
  getComparisonDetail: vi.fn(),
  getComparisonEquity: vi.fn(),
}));
vi.mock('react-router-dom', () => ({ useParams: () => ({ groupId: routeState.groupId }) }));
vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock('src/routes/components', () => ({
  RouterLink: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../hooks/use-backtest-job', () => ({
  useBacktestJob: (
    jobId: string | undefined,
    options: { onProgress: () => void; onCompleted: () => void; onFailed: () => void }
  ) => {
    jobState.jobId = jobId;
    jobState.options = options;
  },
}));
vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: (props: unknown) => {
    chartCalls.props.push(props);
    return <div data-testid="comparison-chart" />;
  },
}));

const metric: ComparisonMetricsRow = {
  runId: 'run-1',
  label: '增强策略',
  strategyType: 'FACTOR_RANKING',
  totalReturn: 0.12,
  annualizedReturn: 0.08,
  benchmarkReturn: -0.02,
  excessReturn: 0.14,
  maxDrawdown: -0.1,
  sharpeRatio: 1.2,
  sortinoRatio: null,
  calmarRatio: 0.8,
  volatility: 0.2,
  alpha: 0.03,
  beta: 0.9,
  informationRatio: null,
  winRate: 0.55,
  turnoverRate: 1.5,
  tradeCount: 42,
};

function detail(overrides: Partial<ComparisonGroupDetail> = {}): ComparisonGroupDetail {
  return {
    groupId: 'group-1',
    name: '成长与价值对比',
    status: 'COMPLETED',
    startDate: '20260102',
    endDate: '20260630',
    benchmarkTsCode: '000300.SH',
    metrics: [metric],
    createdAt: '2026-07-01T08:00:00Z',
    completedAt: '2026-07-01T09:00:00Z',
    ...overrides,
  };
}

const listItems: ComparisonListItem[] = [
  {
    groupId: 'group-running',
    name: '运行任务',
    status: 'RUNNING',
    strategyCount: 2,
    startDate: '20260102',
    endDate: '20260630',
    benchmarkTsCode: '000300.SH',
    createdAt: '2026-07-01T08:00:00Z',
    progress: 35,
  },
  {
    groupId: 'group-completed',
    name: null,
    status: 'COMPLETED',
    strategyCount: 3,
    startDate: '20250101',
    endDate: '20251231',
    benchmarkTsCode: '000001.SH',
    createdAt: '2026-01-01T08:00:00Z',
    bestSharpe: 1.25,
    bestStrategyLabel: '策略B',
  },
  {
    groupId: 'group-failed',
    name: '失败任务',
    status: 'FAILED',
    strategyCount: 4,
    startDate: '20240101',
    endDate: '20241231',
    benchmarkTsCode: '399006.SZ',
    createdAt: '2025-01-01T08:00:00Z',
    failedCount: 2,
  },
];

describe('ComparisonListView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerPush.mockClear();
    vi.mocked(listComparisons).mockResolvedValue({
      page: 1,
      pageSize: 12,
      total: 25,
      items: listItems,
    });
  });

  it('以 1-based 分页 Body 查询，展示 KPI/格式化日期并支持筛选与下钻', async () => {
    const { user } = renderWithProviders(<ComparisonListView />);

    expect(await screen.findByText('运行任务')).toBeInTheDocument();
    expect(listComparisons).toHaveBeenNthCalledWith(1, {
      page: 1,
      pageSize: 12,
      status: undefined,
      keyword: undefined,
    });
    expect(screen.getByText('33.3%')).toBeInTheDocument();
    expect(screen.getByText('3.0')).toBeInTheDocument();
    expect(screen.getAllByText(/2026-01-02 ~ 2026-06-30/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/20260102/)).not.toBeInTheDocument();
    expect(screen.getByText(/最优 Sharpe 1.25 · 策略B/)).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '查看详情' })[0]);
    expect(routerPush).toHaveBeenCalledWith('/backtest/comparison/group-running');

    await user.click(screen.getAllByRole('combobox')[0]);
    await user.click(screen.getByRole('option', { name: '已完成' }));
    await waitFor(() =>
      expect(listComparisons).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: 'COMPLETED' })
      )
    );
    await user.type(screen.getByRole('textbox', { name: '关键字搜索' }), '价值');
    await waitFor(() =>
      expect(listComparisons).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, status: 'COMPLETED', keyword: '价值' })
      )
    );
    await user.click(screen.getByRole('button', { name: /next page/i }));
    await waitFor(() =>
      expect(listComparisons).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, pageSize: 12 })
      )
    );
  });

  it('覆盖 loading、empty、Error/非 Error 与重试', async () => {
    let resolveList: (value: Awaited<ReturnType<typeof listComparisons>>) => void = () => undefined;
    vi.mocked(listComparisons).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveList = resolve;
        })
    );
    const first = renderWithProviders(<ComparisonListView />);
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(12);
    resolveList({ page: 1, pageSize: 12, total: 0, items: [] });
    expect(await screen.findByText('还没有对比任务')).toBeInTheDocument();
    first.unmount();

    vi.mocked(listComparisons).mockRejectedValueOnce(new Error('对比服务超时'));
    vi.mocked(listComparisons).mockResolvedValueOnce({ page: 1, pageSize: 12, total: 0, items: [] });
    const second = renderWithProviders(<ComparisonListView />);
    expect(await screen.findByText('对比服务超时')).toBeInTheDocument();
    await second.user.click(screen.getByRole('button', { name: '重试' }));
    expect(await screen.findByText('还没有对比任务')).toBeInTheDocument();
    second.unmount();

    vi.mocked(listComparisons).mockRejectedValueOnce('offline');
    renderWithProviders(<ComparisonListView />);
    expect(await screen.findByText('获取多策略对比列表失败')).toBeInTheDocument();
  });
});

describe('ComparisonDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chartCalls.props.length = 0;
    routeState.groupId = 'group-1';
    window.sessionStorage.clear();
    window.history.replaceState({}, '');
    vi.mocked(getComparisonDetail).mockResolvedValue(detail());
    vi.mocked(getComparisonEquity).mockResolvedValue({
      series: [
        {
          runId: 'run-1',
          label: '增强策略',
          points: [
            { tradeDate: '20260102', nav: 1.123456 },
            { tradeDate: '20260103', nav: null },
          ],
        },
      ],
    });
  });

  it('完成态加载净值与指标，紧凑日期不泄漏到标题或图表 categories', async () => {
    window.sessionStorage.setItem('compare:job:group-1', 'job-stored');
    const { user } = renderWithProviders(<ComparisonDetailView />);

    expect(await screen.findByText('成长与价值对比')).toBeInTheDocument();
    expect(getComparisonDetail).toHaveBeenCalledWith('group-1');
    expect(getComparisonEquity).toHaveBeenCalledWith('group-1');
    expect(jobState.jobId).toBe('job-stored');
    expect(screen.getByText(/2026-01-02 ~ 2026-06-30/)).toBeInTheDocument();
    expect(screen.queryByText(/20260102/)).not.toBeInTheDocument();
    expect(await screen.findByText('指标对比 (最优值高亮)')).toBeInTheDocument();
    expect(screen.getByText('+12.00%')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    const chart = chartCalls.props.at(-1) as {
      series: Array<{ data: Array<number | null> }>;
      options: { xaxis: { categories: string[] } };
    };
    expect(chart.series[0].data).toEqual([1.1235, null]);
    expect(chart.options.xaxis.categories).toEqual(['2026-01-02', '2026-01-03']);
    expect(JSON.stringify(chart.options.xaxis.categories)).not.toContain('20260102');

    await user.click(screen.getByRole('button', { name: '刷新' }));
    await waitFor(() => expect(getComparisonDetail).toHaveBeenCalledTimes(2));
  });

  it('运行态不提前请求净值；job 完成/失败均刷新服务端真相', async () => {
    vi.mocked(getComparisonDetail)
      .mockResolvedValueOnce(detail({ status: 'RUNNING', metrics: [] }))
      .mockResolvedValue(detail({ status: 'COMPLETED' }));
    window.history.replaceState({ usr: { jobId: 'job-route' } }, '');
    renderWithProviders(<ComparisonDetailView />);

    expect(await screen.findByText('策略对比正在运行中，请等待…')).toBeInTheDocument();
    expect(getComparisonEquity).not.toHaveBeenCalled();
    expect(jobState.jobId).toBe('job-route');
    await act(async () => jobState.options?.onCompleted());
    await waitFor(() => expect(getComparisonDetail).toHaveBeenCalledTimes(2));
    await act(async () => jobState.options?.onFailed());
    await waitFor(() => expect(getComparisonDetail).toHaveBeenCalledTimes(3));
  });

  it('PARTIAL 保留成功结果与失败计数；净值错误降级为空图', async () => {
    vi.mocked(getComparisonDetail).mockResolvedValue(
      detail({
        status: 'PARTIAL',
        failures: [{ runId: 'bad-run', errorMessage: '参数非法' }],
      })
    );
    vi.mocked(getComparisonEquity).mockRejectedValue(new Error('净值尚未汇总'));
    renderWithProviders(<ComparisonDetailView />);

    expect(await screen.findByText(/部分策略执行失败.*失败数量：1/)).toBeInTheDocument();
    expect(await screen.findByText('暂无净值数据')).toBeInTheDocument();
    expect(screen.getByText('指标对比 (最优值高亮)')).toBeInTheDocument();
  });

  it('详情 Error、非 Error 与不存在均有明确错误状态', async () => {
    vi.mocked(getComparisonDetail).mockRejectedValueOnce(new Error('详情权限不足'));
    const first = renderWithProviders(<ComparisonDetailView />);
    expect(await screen.findByText('详情权限不足')).toBeInTheDocument();
    first.unmount();

    vi.mocked(getComparisonDetail).mockRejectedValueOnce('offline');
    const second = renderWithProviders(<ComparisonDetailView />);
    expect(await screen.findByText('获取详情失败')).toBeInTheDocument();
    second.unmount();

    routeState.groupId = '';
    renderWithProviders(<ComparisonDetailView />);
    expect(await screen.findByText('对比任务不存在')).toBeInTheDocument();
  });
});
