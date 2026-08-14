import type { BacktestEquityPoint, BacktestRunDetailResponse } from 'src/api/backtest';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { BacktestEquityChart } from '../backtest-equity-chart';
import { BacktestConfigDrawer } from '../backtest-config-drawer';
import { BacktestDetailHeader } from '../backtest-detail-header';
import { BacktestDrawdownChart } from '../backtest-drawdown-chart';

const chartSpy = vi.hoisted(() => vi.fn());

vi.mock('src/components/chart', () => ({
  Chart: (props: unknown) => {
    chartSpy(props);
    return <div>图表</div>;
  },
  useChart: (options: unknown) => options,
}));

vi.mock('src/components/iconify', () => ({
  Iconify: ({ icon }: { icon: string }) => <span data-icon={icon} />,
}));

const point: BacktestEquityPoint = {
  tradeDate: '20260812',
  nav: 1.1,
  benchmarkNav: 1.05,
  drawdown: -0.03,
  dailyReturn: 0.01,
  benchmarkReturn: 0.005,
  exposure: 0.8,
  cashRatio: 0.2,
};

describe('backtest compact date presentation', () => {
  beforeEach(() => chartSpy.mockClear());

  it.each([
    ['净值', BacktestEquityChart],
    ['回撤', BacktestDrawdownChart],
  ])('%s图表 x 轴格式化 YYYYMMDD', (_name, Component) => {
    renderWithProviders(<Component points={[point]} />);

    const options = chartSpy.mock.calls[0][0].options as {
      xaxis: { categories: string[] };
    };
    expect(options.xaxis.categories).toEqual(['2026-08-12']);
  });

  it('详情头格式化运行区间且保留操作门禁', () => {
    const detail = {
      name: '均线回测',
      status: 'RUNNING',
      strategyType: 'MA_CROSS_SINGLE',
      startDate: '20250101',
      endDate: '20251231',
      benchmarkTsCode: '000300.SH',
    } as BacktestRunDetailResponse;
    const onCancel = vi.fn();
    const onCopy = vi.fn();
    const { user } = renderWithProviders(
      <BacktestDetailHeader
        detail={detail}
        onCancel={onCancel}
        onCopy={onCopy}
        cancelling={false}
      />
    );

    expect(screen.getByText(/2025-01-01 ~ 2025-12-31/)).toBeInTheDocument();
    expect(screen.queryByText(/20250101/)).not.toBeInTheDocument();
    return user.click(screen.getByRole('button', { name: '取消任务' })).then(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  it('运行配置不直接展示紧凑交易日', () => {
    const detail: BacktestRunDetailResponse = {
      runId: 'run-1',
      jobId: null,
      name: '均线回测',
      status: 'COMPLETED',
      progress: 100,
      failedReason: null,
      strategyType: 'MA_CROSS_SINGLE',
      strategyConfig: { shortWindow: 5 },
      startDate: '20250101',
      endDate: '20251231',
      benchmarkTsCode: '000300.SH',
      universe: 'HS300',
      initialCapital: 1_000_000,
      rebalanceFrequency: 'MONTHLY',
      priceMode: 'CLOSE',
      summary: {
        totalReturn: null,
        annualizedReturn: null,
        benchmarkReturn: null,
        excessReturn: null,
        maxDrawdown: null,
        sharpeRatio: null,
        sortinoRatio: null,
        calmarRatio: null,
        volatility: null,
        alpha: null,
        beta: null,
        informationRatio: null,
        winRate: null,
        turnoverRate: null,
        tradeCount: null,
      },
      createdAt: '2026-08-13T00:00:00Z',
      startedAt: null,
      completedAt: null,
    };

    renderWithProviders(<BacktestConfigDrawer detail={detail} />);

    expect(screen.getByText('2025-01-01 ~ 2025-12-31')).toBeInTheDocument();
    expect(screen.queryByText(/20250101|20251231/)).not.toBeInTheDocument();
  });
});
