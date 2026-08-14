/** @vitest-environment jsdom */

import type { ReactNode } from 'react';
import type { BacktestRunDetailResponse } from 'src/api/backtest';

import { vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import {
  cancelRun,
  getRunDetail,
  getRunEquity,
  getRunTrades,
  getRunPositions,
  getRunRebalanceLogs,
} from 'src/api/backtest';

import { BacktestRunDetailView } from '../view/backtest-run-detail-view';

type JobHandlers = {
  onProgress: (event: { progress: number }) => void;
  onCompleted: () => void;
  onFailed: (event: { reason: string }) => void;
};

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  jobHandlers: null as JobHandlers | null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return { ...actual, useParams: () => ({ runId: 'run-42' }) };
});

vi.mock('src/routes/hooks', () => ({ useRouter: () => ({ push: mocks.push }) }));

vi.mock('src/api/backtest', () => ({
  cancelRun: vi.fn(),
  getRunDetail: vi.fn(),
  getRunEquity: vi.fn(),
  getRunTrades: vi.fn(),
  getRunPositions: vi.fn(),
  getRunRebalanceLogs: vi.fn(),
}));

vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

vi.mock('src/components/date-picker', () => ({
  DatePicker: ({ onChange }: { onChange: (value: { format: () => string } | null) => void }) => (
    <button type="button" onClick={() => onChange({ format: () => '2026-08-11' })}>
      选择持仓日
    </button>
  ),
}));

vi.mock('../hooks/use-backtest-job', () => ({
  useBacktestJob: (_jobId: string | null | undefined, handlers: JobHandlers) => {
    mocks.jobHandlers = handlers;
  },
}));

vi.mock('../backtest-detail-header', () => ({
  BacktestDetailHeader: ({
    detail: runDetail,
    onCancel,
    onCopy,
    onGenerateReport,
  }: {
    detail: BacktestRunDetailResponse;
    onCancel: () => void;
    onCopy: () => void;
    onGenerateReport: () => void;
  }) => (
    <header>
      <span>任务状态：{runDetail.status}</span>
      <span>进度：{runDetail.progress}</span>
      <button type="button" onClick={onCancel}>
        取消任务
      </button>
      <button type="button" onClick={onCopy}>
        复制配置
      </button>
      <button type="button" onClick={onGenerateReport}>
        生成报告
      </button>
    </header>
  ),
}));

vi.mock('../backtest-reproducibility-alert', () => ({
  BacktestReproducibilityAlert: () => <div>复现信息</div>,
}));

vi.mock('../backtest-progress-banner', () => ({
  BacktestProgressBanner: ({ detail: runDetail }: { detail: BacktestRunDetailResponse }) => (
    <div>运行进度：{runDetail.progress}</div>
  ),
}));

vi.mock('../backtest-metrics-grid', () => ({ BacktestMetricsGrid: () => <div>指标网格</div> }));
vi.mock('../backtest-equity-chart', () => ({ BacktestEquityChart: () => <div>净值曲线</div> }));
vi.mock('../backtest-drawdown-chart', () => ({ BacktestDrawdownChart: () => <div>回撤曲线</div> }));
vi.mock('../backtest-monthly-return-table', () => ({
  BacktestMonthlyReturnTable: () => <div>月度收益</div>,
}));

vi.mock('../backtest-trades-table', () => ({
  BacktestTradesTable: ({
    total,
    page,
    pageSize,
    loading,
    onPageChange,
    onPageSizeChange,
  }: {
    total: number;
    page: number;
    pageSize: number;
    loading: boolean;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  }) => (
    <section aria-label="交易表">
      <span>交易：{total} / 页 {page + 1} / {pageSize}</span>
      <span>交易加载：{String(loading)}</span>
      <button type="button" onClick={() => onPageChange(1)}>
        交易下一页
      </button>
      <button type="button" onClick={() => onPageSizeChange(20)}>
        每页 20
      </button>
    </section>
  ),
}));

vi.mock('../backtest-positions-table', () => ({
  BacktestPositionsTable: ({
    items,
    loading,
  }: {
    items: Array<{ tsCode: string }>;
    loading: boolean;
  }) => <div>持仓：{items.map((item) => item.tsCode).join(',')} / {String(loading)}</div>,
}));

vi.mock('../backtest-rebalance-log-table', () => ({
  BacktestRebalanceLogTable: ({ items }: { items: Array<{ signalDate: string }> }) => (
    <div>调仓：{items.map((item) => item.signalDate).join(',')}</div>
  ),
}));

vi.mock('../backtest-config-drawer', () => ({ BacktestConfigDrawer: () => <div>运行配置内容</div> }));
vi.mock('../view/backtest-advanced-analysis-tab', () => ({
  BacktestAdvancedAnalysisTab: ({ runId }: { runId: string }) => <div>高级分析：{runId}</div>,
}));

vi.mock('src/sections/report/report-generate-dialog', () => ({
  ReportGenerateDialog: ({ open, onGenerated }: { open: boolean; onGenerated: () => void }) =>
    open ? (
      <button type="button" onClick={onGenerated}>
        报告对话框
      </button>
    ) : null,
}));

vi.mock('../backtest-apply-portfolio-dialog', () => ({
  BacktestApplyPortfolioDialog: ({
    open,
    onSuccess,
  }: {
    open: boolean;
    onSuccess: (id: string, name: string) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onSuccess('portfolio-1', '稳健组合')}>
        确认导入组合
      </button>
    ) : null,
}));

const summary: BacktestRunDetailResponse['summary'] = {
  totalReturn: 0.12,
  annualizedReturn: 0.1,
  benchmarkReturn: 0.05,
  excessReturn: 0.07,
  maxDrawdown: -0.08,
  sharpeRatio: 1.2,
  sortinoRatio: 1.5,
  calmarRatio: 1.25,
  volatility: 0.16,
  alpha: 0.04,
  beta: 0.9,
  informationRatio: 0.7,
  winRate: 0.56,
  turnoverRate: 0.3,
  tradeCount: 10,
};

function makeDetail(status: BacktestRunDetailResponse['status']): BacktestRunDetailResponse {
  return {
    runId: 'run-42',
    jobId: 'job-42',
    name: '双均线回测',
    status,
    progress: status === 'COMPLETED' ? 100 : 25,
    failedReason: status === 'FAILED' ? '行情数据缺失' : null,
    strategyType: 'MA_CROSS_SINGLE',
    strategyConfig: { shortWindow: 5, longWindow: 20 },
    startDate: '20260101',
    endDate: '20260812',
    benchmarkTsCode: '000300.SH',
    universe: '000300.SH',
    initialCapital: 1_000_000,
    rebalanceFrequency: 'DAILY',
    priceMode: 'CLOSE',
    summary,
    createdAt: '2026-08-12T08:00:00Z',
    startedAt: '2026-08-12T08:01:00Z',
    completedAt: status === 'COMPLETED' ? '2026-08-12T08:05:00Z' : null,
  };
}

const equityPoint = {
  tradeDate: '20260812',
  nav: 1.12,
  benchmarkNav: 1.05,
  drawdown: -0.02,
  dailyReturn: 0.01,
  benchmarkReturn: 0.005,
  exposure: 0.9,
  cashRatio: 0.1,
};

describe('BacktestRunDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jobHandlers = null;
    vi.mocked(getRunDetail).mockResolvedValue(makeDetail('COMPLETED'));
    vi.mocked(getRunEquity).mockResolvedValue({ points: [equityPoint] });
    vi.mocked(getRunTrades).mockResolvedValue({ page: 1, pageSize: 50, total: 1, items: [] });
    vi.mocked(getRunPositions).mockResolvedValue({
      tradeDate: '20260812',
      items: [
        {
          tsCode: '000001.SZ',
          name: '平安银行',
          quantity: 100,
          costPrice: 10,
          closePrice: 11,
          marketValue: 1100,
          weight: 0.1,
          unrealizedPnl: 100,
          holdingDays: 5,
        },
      ],
    });
    vi.mocked(getRunRebalanceLogs).mockResolvedValue({
      items: [
        {
          signalDate: '20260811',
          executeDate: '20260812',
          targetCount: 10,
          actualBuy: 5,
          actualSell: 4,
          skippedLimitUp: 1,
          skippedSuspend: 0,
          remark: null,
        },
      ],
    });
    vi.mocked(cancelRun).mockResolvedValue({ runId: 'run-42', status: 'CANCELLED' });
  });

  it('加载详情、净值和分页交易，并按需加载持仓/调仓/高级分析', async () => {
    const { user } = renderWithProviders(<BacktestRunDetailView />);

    expect(await screen.findByText('任务状态：COMPLETED')).toBeInTheDocument();
    expect(getRunDetail).toHaveBeenCalledWith('run-42');
    expect(getRunEquity).toHaveBeenCalledWith('run-42');
    expect(getRunTrades).toHaveBeenCalledWith('run-42', 1, 50);
    expect(screen.getByText('净值曲线')).toBeInTheDocument();
    expect(screen.getByText('交易：1 / 页 1 / 50')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '交易下一页' }));
    await waitFor(() => expect(getRunTrades).toHaveBeenCalledWith('run-42', 2, 50));
    await user.click(screen.getByRole('button', { name: '每页 20' }));
    await waitFor(() => expect(getRunTrades).toHaveBeenCalledWith('run-42', 1, 20));

    await user.click(screen.getByRole('tab', { name: '持仓快照' }));
    expect(await screen.findByText(/持仓：000001\.SZ/)).toBeInTheDocument();
    expect(getRunPositions).toHaveBeenCalledWith('run-42');
    await user.click(screen.getByRole('button', { name: '选择持仓日' }));
    await waitFor(() => expect(getRunPositions).toHaveBeenLastCalledWith('run-42', '20260811'));

    await user.click(screen.getByRole('tab', { name: '调仓日志' }));
    expect(await screen.findByText('调仓：20260811')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '运行配置' }));
    expect(screen.getByText('运行配置内容')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '高级分析' }));
    expect(screen.getByText('高级分析：run-42')).toBeInTheDocument();
  });

  it('复制配置、取消、报告与导入组合动作都保留任务语义', async () => {
    const { user } = renderWithProviders(<BacktestRunDetailView />);
    await screen.findByText('任务状态：COMPLETED');

    await user.click(screen.getByRole('button', { name: '复制配置' }));
    expect(mocks.push).toHaveBeenCalledWith('/backtest', {
      state: expect.objectContaining({
        templateId: 'MA_CROSS_SINGLE',
        startDate: '20260101',
        benchmarkTsCode: '000300.SH',
        strategyConfig: { shortWindow: 5, longWindow: 20 },
      }),
    });

    await user.click(screen.getByRole('button', { name: '取消任务' }));
    await waitFor(() => expect(cancelRun).toHaveBeenCalledWith('run-42'));
    await waitFor(() => expect(getRunDetail).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('button', { name: '生成报告' }));
    expect(screen.getByRole('button', { name: '报告对话框' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '导入组合' }));
    await user.click(screen.getByRole('button', { name: '确认导入组合' }));
    expect(await screen.findByText('已成功导入组合「稳健组合」')).toBeInTheDocument();
  });

  it('运行中接收进度/失败事件；详情错误提供明确错误态', async () => {
    vi.mocked(getRunDetail).mockResolvedValueOnce(makeDetail('RUNNING'));
    const { unmount } = renderWithProviders(<BacktestRunDetailView />);
    expect(await screen.findByText('任务状态：RUNNING')).toBeInTheDocument();
    expect(screen.getByText('运行进度：25')).toBeInTheDocument();

    act(() => mocks.jobHandlers?.onProgress({ progress: 64 }));
    expect(await screen.findByText('运行进度：64')).toBeInTheDocument();
    act(() => mocks.jobHandlers?.onFailed({ reason: '撮合数据异常' }));
    expect(await screen.findByText('回测失败：撮合数据异常')).toBeInTheDocument();
    unmount();

    vi.mocked(getRunDetail).mockRejectedValueOnce(new Error('任务不存在'));
    renderWithProviders(<BacktestRunDetailView />);
    expect(await screen.findByText('任务不存在')).toBeInTheDocument();
  });
});
