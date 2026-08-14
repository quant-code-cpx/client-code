/** @vitest-environment jsdom */

import type {
  MonteCarloResponse,
  CostSensitivityResponse,
  BrinsonAttributionResponse,
  ValidateBacktestRunResponse,
} from 'src/api/backtest';

import { vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';
import { runMonteCarlo, runAttribution, analyzeCostSensitivity } from 'src/api/backtest';

import { DEFAULT_FORM } from '../constants';
import { BacktestValidatePanel } from '../backtest-validate-panel';
import { BacktestSubmitSummary } from '../backtest-submit-summary';
import { BacktestMonteCarloPanel } from '../backtest-monte-carlo-panel';
import { BacktestAttributionPanel } from '../backtest-attribution-panel';
import { BacktestCostSensitivityPanel } from '../backtest-cost-sensitivity-panel';

vi.mock('src/api/backtest', () => ({
  runMonteCarlo: vi.fn(),
  runAttribution: vi.fn(),
  analyzeCostSensitivity: vi.fn(),
}));

vi.mock('src/components/chart', () => ({
  useChart: (options: unknown) => options,
  Chart: ({ type, series }: { type: string; series: Array<{ name: string }> }) => (
    <div>图表：{type} / {series.map((item) => item.name).join(',')}</div>
  ),
}));

const ready = {
  hasDaily: true,
  hasAdjFactor: true,
  hasTradeCal: true,
  hasIndexDaily: true,
  hasStkLimit: true,
  hasSuspendD: true,
  hasIndexWeight: true,
};

function validation(
  overrides: Partial<ValidateBacktestRunResponse> = {}
): ValidateBacktestRunResponse {
  return {
    isValid: true,
    warnings: [],
    errors: [],
    dataReadiness: ready,
    stats: {
      tradingDays: 145,
      estimatedUniverseSize: 300,
      earliestAvailableDate: '2005-01-04',
      latestAvailableDate: '2026-08-12',
    },
    ...overrides,
  };
}

const monteCarloResult: MonteCarloResponse = {
  numSimulations: 500,
  originalFinalNav: 1.2,
  originalTotalReturn: 0.2,
  finalNavDistribution: {
    mean: 1.15,
    median: 1.14,
    std: 0.08,
    positiveReturnProbability: 0.72,
  },
  maxDrawdownDistribution: { mean: -0.12, median: -0.1, percentile95: -0.25 },
  annualizedReturnDistribution: { mean: 0.12, median: 0.11, std: 0.05 },
  timeSeries: [
    {
      dayIndex: 0,
      percentiles: { 5: 0.9, 25: 0.95, 50: 1, 75: 1.05, 95: 1.1 },
    },
    {
      dayIndex: 20,
      percentiles: { 5: 0.85, 25: 1, 50: 1.1, 75: 1.2, 95: 1.35 },
    },
  ],
};

const costResult: CostSensitivityResponse = {
  runId: 'run-1',
  baselineMetrics: { totalReturn: 0.15 },
  results: [
    {
      commissionRate: 0.0001,
      stampDutyRate: 0,
      slippageBps: 2,
      totalReturn: 0.18,
      annualizedReturn: 0.12,
      sharpeRatio: 1.35,
      maxDrawdown: -0.08,
      totalCost: 6000,
    },
    {
      commissionRate: 0.0005,
      stampDutyRate: 0,
      slippageBps: 5,
      totalReturn: -0.03,
      annualizedReturn: -0.02,
      sharpeRatio: null,
      maxDrawdown: -0.2,
      totalCost: 30000,
    },
  ],
};

const attributionResult: BrinsonAttributionResponse = {
  runId: 'run-1',
  granularity: 'MONTHLY',
  industryLevel: 'L1',
  cumulative: {
    totalAllocationEffect: 0.02,
    totalSelectionEffect: -0.01,
    totalInteractionEffect: 0,
    totalActiveReturn: 0.01,
  },
  periods: [
    {
      periodLabel: '2026-07',
      totalAllocationEffect: 0.02,
      totalSelectionEffect: -0.01,
      totalInteractionEffect: 0,
      totalActiveReturn: 0.01,
      industries: [
        {
          industryCode: '801780',
          industryName: '银行',
          portfolioWeight: 0.2,
          benchmarkWeight: 0.15,
          portfolioReturn: 0.08,
          benchmarkReturn: 0.04,
          allocationEffect: 0.01,
          selectionEffect: 0.008,
          interactionEffect: 0.002,
          totalEffect: 0.02,
        },
      ],
    },
  ],
};

describe('BacktestValidatePanel', () => {
  it('覆盖 loading、empty 和校验 stale 状态', () => {
    const loadingView = renderWithProviders(<BacktestValidatePanel validation={null} loading />);
    expect(document.querySelectorAll('.MuiSkeleton-root')).toHaveLength(6);

    loadingView.unmount();
    const emptyView = renderWithProviders(
      <BacktestValidatePanel validation={null} loading={false} />
    );
    expect(screen.getByText('系统将在配置变更后自动校验数据完备性')).toBeInTheDocument();

    emptyView.unmount();
    renderWithProviders(<BacktestValidatePanel validation={validation()} loading={false} stale />);
    expect(screen.getByText('正在重新校验')).toBeInTheDocument();
  });

  it('保留 null、百分比估算、字段错误、警告和相似运行下钻语义', async () => {
    const onOpenRun = vi.fn();
    const { user } = renderWithProviders(
      <BacktestValidatePanel
        loading={false}
        onOpenRun={onOpenRun}
        validation={validation({
          isValid: false,
          warnings: ['停牌数据覆盖不足'],
          errors: ['结束日期无行情'],
          fieldErrors: [{ path: 'strategyConfig.shortWindow', message: '必须小于长期窗口' }],
          estimatedRebalanceCount: 24,
          estimatedTradeCount: 480,
          estimatedRuntimeSeconds: 125,
          dataGapPercentage: 0.025,
          dataReadiness: { ...ready, hasSuspendD: false },
          stats: {
            tradingDays: 145,
            estimatedUniverseSize: null,
            earliestAvailableDate: null,
            latestAvailableDate: '2026-08-12',
          },
          similarCompletedRuns: [
            {
              runId: 'similar-1',
              name: '相似双均线',
              createdAt: new Date().toISOString(),
              totalReturn: 0.18,
              similarityScore: 0.96,
            },
          ],
        })}
      />
    );

    expect(screen.getByText('有错误')).toBeInTheDocument();
    expect(screen.getByText('~2min')).toBeInTheDocument();
    expect(screen.getByText('2.5%')).toBeInTheDocument();
    expect(screen.getByText(/strategyConfig\.shortWindow/)).toBeInTheDocument();
    expect(screen.getByText(/结束日期无行情/)).toBeInTheDocument();
    expect(screen.getByText(/停牌数据覆盖不足/)).toBeInTheDocument();
    expect(screen.getByText(/收益 18%/)).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '查看' }));
    expect(onOpenRun).toHaveBeenCalledWith('similar-1');
  });
});

describe('BacktestSubmitSummary', () => {
  it('摘要展开偏离项；仅最新通过校验允许提交', async () => {
    const onValidate = vi.fn();
    const onSubmit = vi.fn();
    const customForm = {
      ...DEFAULT_FORM,
      initialCapital: 2_000_000,
      commissionRate: 0.00015,
      maxWeightPerStock: 0.15,
      strategyConfig: { tsCode: '600519.SH', shortWindow: 8, longWindow: 30, allowFlat: false },
    };
    const firstView = renderWithProviders(
      <BacktestSubmitSummary
        form={customForm}
        selectedTemplateId="MA_CROSS_SINGLE"
        validation={validation({ estimatedRuntimeSeconds: 75 })}
        validating={false}
        submitting={false}
        onValidate={onValidate}
        onSubmit={onSubmit}
      />
    );
    const { user } = firstView;

    expect(screen.getByText('均线择时')).toBeInTheDocument();
    expect(screen.getByText('偏离默认参数：6 项')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始回测（预计 ~1min）' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: '展开偏离默认参数' }));
    expect(await screen.findAllByText('¥ 2,000,000')).toHaveLength(2);
    expect(screen.getByText('策略参数.shortWindow')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '立即校验' }));
    await user.click(screen.getByRole('button', { name: '开始回测（预计 ~1min）' }));
    expect(onValidate).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    firstView.unmount();
    renderWithProviders(
      <BacktestSubmitSummary
        form={customForm}
        selectedTemplateId="MA_CROSS_SINGLE"
        validation={validation({ errors: ['配置非法'] })}
        validating={false}
        validationStale
        submitting={false}
        onValidate={onValidate}
        onSubmit={onSubmit}
      />
    );
    expect(screen.getByText('配置已变更，等待最新校验结果后即可提交')).toBeInTheDocument();
    expect(screen.getByText('存在校验错误，无法提交')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始回测' })).toBeDisabled();
  });
});

describe('BacktestMonteCarloPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('用用户输入的模拟次数调用 API，并展示金融分布与包络线', async () => {
    vi.mocked(runMonteCarlo).mockResolvedValue(monteCarloResult);
    const { user } = renderWithProviders(<BacktestMonteCarloPanel runId="run-1" />);

    expect(screen.getByText('点击「运行模拟」以开始蒙特卡洛分析')).toBeInTheDocument();
    const input = screen.getByRole('spinbutton', { name: '模拟次数' });
    await user.clear(input);
    await user.type(input, '500');
    await user.click(screen.getByRole('button', { name: '运行模拟' }));

    await waitFor(() =>
      expect(runMonteCarlo).toHaveBeenCalledWith({ runId: 'run-1', numSimulations: 500 })
    );
    expect(await screen.findByText('12.00%')).toBeInTheDocument();
    expect(screen.getByText('72.00%')).toBeInTheDocument();
    expect(screen.getByText('净值分位数包络线（500 条路径）')).toBeInTheDocument();
    expect(screen.getByText('图表：rangeArea / 5%~95%,25%~75%,中位数')).toBeInTheDocument();
  });

  it('保留 API 错误供用户诊断', async () => {
    vi.mocked(runMonteCarlo).mockRejectedValue(new Error('模拟样本不足'));
    const { user } = renderWithProviders(<BacktestMonteCarloPanel runId="run-1" />);
    await user.click(screen.getByRole('button', { name: '运行模拟' }));
    expect(await screen.findByText('模拟样本不足')).toBeInTheDocument();
  });
});

describe('BacktestCostSensitivityPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('按 runId 分析成本，展示正负收益、null 指标和结果矩阵', async () => {
    vi.mocked(analyzeCostSensitivity).mockResolvedValue(costResult);
    const { user } = renderWithProviders(<BacktestCostSensitivityPanel runId="run-1" />);
    await user.click(screen.getByRole('button', { name: '运行分析' }));

    expect(analyzeCostSensitivity).toHaveBeenCalledWith({ runId: 'run-1' });
    expect(await screen.findByText('年化收益率 vs 佣金费率')).toBeInTheDocument();
    expect(screen.getByText(/^图表：line/)).toBeInTheDocument();
    expect(screen.getByText('总交易成本（元）')).toBeInTheDocument();
    expect(screen.getByText('图表：line / 滑点 2 bps,滑点 5 bps')).toBeInTheDocument();
    expect(screen.getByText('2 bps')).toBeInTheDocument();
    expect(screen.getByText('5 bps')).toBeInTheDocument();
    expect(screen.getByText('¥6,000')).toBeInTheDocument();
    expect(screen.getByText('¥30,000')).toBeInTheDocument();
    expect(screen.queryByText('20,000 bps')).not.toBeInTheDocument();
    expect(screen.getByText('12.00%')).toBeInTheDocument();
    expect(screen.getByText('-2.00%')).toBeInTheDocument();
    expect(screen.getByText('--')).toBeInTheDocument();
  });

  it('展示服务端错误并保持可重试入口', async () => {
    vi.mocked(analyzeCostSensitivity).mockRejectedValue(new Error('分析队列繁忙'));
    const { user } = renderWithProviders(<BacktestCostSensitivityPanel runId="run-1" />);
    await user.click(screen.getByRole('button', { name: '运行分析' }));
    expect(await screen.findByText('分析队列繁忙')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '运行分析' })).toBeEnabled();
  });
});

describe('BacktestAttributionPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('以明确基准/频率请求 Brinson 归因，并下钻行业权重与收益', async () => {
    vi.mocked(runAttribution).mockResolvedValue(attributionResult);
    const { user } = renderWithProviders(<BacktestAttributionPanel runId="run-1" />);

    expect(screen.getByText('选择基准指数和分析频率后，点击「运行归因」')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '运行归因' }));
    expect(runAttribution).toHaveBeenCalledWith({
      runId: 'run-1',
      benchmarkTsCode: '000300.SH',
      granularity: 'MONTHLY',
    });
    expect(await screen.findByText('配置效应（累计）')).toBeInTheDocument();
    expect(screen.getAllByText('2.00%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-1.00%')).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: '展开详情' }));
    expect(await screen.findByText('银行')).toBeInTheDocument();
    expect(screen.getByText('20.00%')).toBeInTheDocument();
    expect(screen.getByText('15.00%')).toBeInTheDocument();
  });

  it('错误后恢复重试入口', async () => {
    vi.mocked(runAttribution).mockRejectedValue(new Error('行业映射缺失'));
    const { user } = renderWithProviders(<BacktestAttributionPanel runId="run-1" />);
    await user.click(screen.getByRole('button', { name: '运行归因' }));
    expect(await screen.findByText('行业映射缺失')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '运行归因' })).toBeEnabled();
  });
});
