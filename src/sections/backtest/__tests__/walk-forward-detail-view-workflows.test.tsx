/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type * as ReactRouterModule from 'react-router';
import type { WalkForwardWindow, WalkForwardRunDetail } from 'src/api/backtest';

import { vi } from 'vitest';
import { useLocation } from 'react-router';
import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import {
  cancelWalkForwardRun,
  getWalkForwardEquity,
  getWalkForwardRunDetail,
} from 'src/api/backtest';

import { WalkForwardDetailView } from '../view/walk-forward-detail-view';

import type {
  BacktestFailedEvent,
  BacktestProgressEvent,
  BacktestCompletedEvent,
} from '../hooks/use-backtest-job';

const routeState = vi.hoisted(() => ({ wfRunId: 'wf-1' }));
const jobState = vi.hoisted(() => ({
  jobId: undefined as string | undefined,
  options: undefined as
    | {
        onProgress: (event: BacktestProgressEvent) => void;
        onCompleted: (event: BacktestCompletedEvent) => void;
        onFailed: (event: BacktestFailedEvent) => void;
      }
    | undefined,
}));

vi.mock('src/api/backtest', () => ({
  cancelWalkForwardRun: vi.fn(),
  getWalkForwardEquity: vi.fn(),
  getWalkForwardRunDetail: vi.fn(),
}));
vi.mock('react-router-dom', async () => {
  const router = await vi.importActual<typeof ReactRouterModule>('react-router');
  return {
    useParams: () => ({ wfRunId: routeState.wfRunId }),
    useSearchParams: router.useSearchParams,
  };
});
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
    options: {
      onProgress: (event: BacktestProgressEvent) => void;
      onCompleted: (event: BacktestCompletedEvent) => void;
      onFailed: (event: BacktestFailedEvent) => void;
    }
  ) => {
    jobState.jobId = jobId;
    jobState.options = options;
  },
}));
vi.mock('../walk-forward-summary-cards', () => ({
  WalkForwardSummaryCards: ({ detail: runDetail }: { detail: WalkForwardRunDetail }) => (
    <div>摘要：{runDetail.oosSharpeRatio ?? 'null'}</div>
  ),
}));
vi.mock('../walk-forward-equity-chart', () => ({
  WalkForwardEquityChart: ({ points }: { points: Array<{ tradeDate: string }> }) => (
    <div>净值点：{points.map((point) => point.tradeDate).join(',') || 'empty'}</div>
  ),
}));
vi.mock('../walk-forward-progress-card', () => ({
  WalkForwardProgressCard: ({
    detail: runDetail,
    progressEvent,
  }: {
    detail: WalkForwardRunDetail;
    progressEvent: BacktestProgressEvent | null;
  }) => <div>运行进度：{progressEvent?.progress ?? runDetail.progress}</div>,
}));
vi.mock('../walk-forward-robustness-panel', () => ({
  WalkForwardRobustnessPanel: () => <div>稳健性面板</div>,
}));
vi.mock('../walk-forward-config-recap', () => ({
  WalkForwardConfigRecap: () => <div>配置复盘面板</div>,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前位置">{location.pathname}{location.search}</output>;
}

const windowItem: WalkForwardWindow = {
  windowIndex: 0,
  isStartDate: '20260102',
  isEndDate: '20260331',
  oosStartDate: '20260401',
  oosEndDate: '20260430',
  optimizedParams: { topN: 20 },
  isReturn: 0.12,
  isSharpe: 1.2,
  oosReturn: -0.03,
  oosSharpe: 0.5,
  oosMaxDrawdown: -0.08,
  status: 'OK',
  errorReason: null,
  oosTrades: 12,
};

function detail(overrides: Partial<WalkForwardRunDetail> = {}): WalkForwardRunDetail {
  return {
    wfRunId: 'wf-1',
    jobId: 'job-1',
    name: '因子稳健性验证',
    baseStrategyType: 'FACTOR_RANKING',
    baseStrategyConfig: { topN: 20 },
    paramSearchSpace: { topN: { type: 'range', min: 10, max: 30, step: 10 } },
    windowMode: 'ROLLING',
    purgeDays: 5,
    embargoDays: 2,
    minOosTrades: 10,
    robustnessLevel: 'GREEN',
    wfe: 0.7,
    oosNegativeWindowRate: 0.2,
    status: 'COMPLETED',
    progress: 100,
    failedReason: null,
    fullStartDate: '20260102',
    fullEndDate: '20261231',
    inSampleDays: 120,
    outOfSampleDays: 20,
    stepDays: 20,
    optimizeMetric: 'sharpeRatio',
    benchmarkTsCode: '000300.SH',
    universe: 'HS300',
    initialCapital: 1_000_000,
    rebalanceFrequency: 'MONTHLY',
    windowCount: 5,
    completedWindows: 5,
    oosAnnualizedReturn: 0.1,
    oosSharpeRatio: 1.1,
    oosMaxDrawdown: -0.08,
    isOosReturnVsIs: 0.65,
    windows: [windowItem],
    createdAt: '2026-01-01T08:00:00Z',
    completedAt: '2026-12-31T08:00:00Z',
    ...overrides,
  };
}

describe('WalkForwardDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.wfRunId = 'wf-1';
    vi.mocked(getWalkForwardRunDetail).mockResolvedValue(detail());
    vi.mocked(getWalkForwardEquity).mockResolvedValue({
      points: [{ tradeDate: '20260401', nav: 1.02, benchmarkNav: 1.01, windowIndex: 0 }],
    });
    vi.mocked(cancelWalkForwardRun).mockResolvedValue({ wfRunId: 'wf-1', status: 'CANCELLED' });
  });

  it('完成态加载 OOS 净值，格式化紧凑区间并通过 URL 切换全部详情页签', async () => {
    const { user } = renderWithProviders(
      <>
        <WalkForwardDetailView />
        <LocationProbe />
      </>,
      { initialEntries: ['/backtest/walk-forward/wf-1?tab=unknown'] }
    );

    expect(await screen.findByText('因子稳健性验证')).toBeInTheDocument();
    expect(getWalkForwardRunDetail).toHaveBeenCalledWith('wf-1');
    expect(getWalkForwardEquity).toHaveBeenCalledWith('wf-1');
    expect(jobState.jobId).toBe('job-1');
    expect(screen.getByText(/2026-01-02 ~ 2026-12-31/)).toBeInTheDocument();
    expect(screen.queryByText(/20260102/)).not.toBeInTheDocument();
    expect(screen.getByText('净值点：20260401')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '稳健性' }));
    expect(screen.getByText('稳健性面板')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '当前位置' })).toHaveTextContent('tab=robustness');

    await user.click(screen.getByRole('tab', { name: '窗口明细' }));
    expect(screen.getByText('2026-01-02 ~ 2026-03-31')).toBeInTheDocument();
    expect(screen.getByText('2026-04-01 ~ 2026-04-30')).toBeInTheDocument();
    expect(screen.queryByText(/20260401/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看窗口 1 详情' }));
    expect(screen.getByRole('heading', { name: '窗口 #1' })).toBeInTheDocument();
    expect(screen.getByText('OOS 成交数').nextElementSibling).toHaveTextContent('12');
    await user.click(screen.getByRole('button', { name: '关闭' }));

    await user.click(screen.getByRole('tab', { name: '配置复盘' }));
    expect(screen.getByText('配置复盘面板')).toBeInTheDocument();
  });

  it('运行态接收 socket 进度，取消后刷新；失败事件立即呈现原因', async () => {
    vi.mocked(getWalkForwardRunDetail).mockResolvedValue(
      detail({ status: 'RUNNING', progress: 10, completedWindows: 1 })
    );
    const { user } = renderWithProviders(<WalkForwardDetailView />);
    expect(await screen.findByText('运行进度：10')).toBeInTheDocument();
    expect(getWalkForwardEquity).not.toHaveBeenCalled();

    await act(async () =>
      jobState.options?.onProgress({
        jobId: 'job-1',
        progress: 45,
        step: 'OOS 评估',
        completedWindows: 2,
        windowCount: 5,
      })
    );
    expect(screen.getByText('运行进度：45')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(cancelWalkForwardRun).toHaveBeenCalledWith('wf-1');
    await waitFor(() => expect(getWalkForwardRunDetail).toHaveBeenCalledTimes(2));

    await act(async () =>
      jobState.options?.onFailed({ jobId: 'job-1', reason: '参数搜索空间无有效组合' })
    );
    expect(await screen.findByText('参数搜索空间无有效组合')).toBeInTheDocument();
  });

  it('job 完成触发刷新；净值暂不可用时使用空数据降级', async () => {
    vi.mocked(getWalkForwardEquity).mockRejectedValueOnce(new Error('净值未汇总'));
    renderWithProviders(<WalkForwardDetailView />);
    expect(await screen.findByText('净值点：empty')).toBeInTheDocument();

    await act(async () =>
      jobState.options?.onCompleted({ jobId: 'job-1', runId: 'wf-1' })
    );
    await waitFor(() => expect(getWalkForwardRunDetail).toHaveBeenCalledTimes(2));
  });

  it('取消与详情错误、非 Error 和缺少路由参数均可解释', async () => {
    vi.mocked(getWalkForwardRunDetail).mockResolvedValueOnce(detail({ status: 'RUNNING' }));
    vi.mocked(cancelWalkForwardRun).mockRejectedValueOnce('offline');
    const first = renderWithProviders(<WalkForwardDetailView />);
    await first.user.click(await screen.findByRole('button', { name: '取消' }));
    expect(await screen.findByText('取消接口待后端支持，前端已保留操作入口')).toBeInTheDocument();
    first.unmount();

    vi.mocked(getWalkForwardRunDetail).mockRejectedValueOnce(new Error('WF 详情权限不足'));
    const second = renderWithProviders(<WalkForwardDetailView />);
    expect(await screen.findByText('WF 详情权限不足')).toBeInTheDocument();
    second.unmount();

    vi.mocked(getWalkForwardRunDetail).mockRejectedValueOnce('offline');
    const third = renderWithProviders(<WalkForwardDetailView />);
    expect(await screen.findByText('获取详情失败')).toBeInTheDocument();
    third.unmount();

    routeState.wfRunId = '';
    renderWithProviders(<WalkForwardDetailView />);
    expect(await screen.findByText('任务不存在')).toBeInTheDocument();
  });
});
