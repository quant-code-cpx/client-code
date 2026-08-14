import type { ReactNode } from 'react';
import type {
  RotationDetailResult,
  SectorValuationResult,
  RotationOverviewResult,
} from 'src/api/market';

import { useState } from 'react';
import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RotationOverviewCards } from '../rotation-overview-cards';
import { RotationValuationChart } from '../rotation-valuation-chart';
import { RotationFlowTrendChart, RotationReturnTrendChart } from '../rotation-detail-trend-charts';

type ChartProps = {
  series: Array<{ name: string; type?: string; data: Array<number | null> }>;
  options: {
    colors?: string[];
    xaxis?: { categories?: string[] };
    chart?: {
      events?: {
        dataPointSelection?: (
          event: unknown,
          chart: unknown,
          options: { dataPointIndex: number }
        ) => void;
      };
    };
    tooltip?: {
      custom?: (input: { dataPointIndex: number }) => string;
      y?: { formatter?: (value: number) => string };
    };
  };
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const apiMock = vi.hoisted(() => ({
  fetchRotationOverview: vi.fn(),
  fetchSectorValuation: vi.fn(),
}));

const chartMock = vi.hoisted(() => vi.fn((_props: unknown) => <div data-testid="chart" />));

vi.mock('src/api/market', () => ({
  fetchRotationOverview: apiMock.fetchRotationOverview,
  fetchSectorValuation: apiMock.fetchSectorValuation,
}));

vi.mock('src/components/chart', () => ({
  Chart: chartMock,
  useChart: (options: unknown) => options,
}));

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function latestChart(seriesName: string): ChartProps {
  const call = [...chartMock.mock.calls]
    .reverse()
    .find(([props]) => (props as ChartProps).series[0]?.name === seriesName);
  if (!call) throw new Error(`Chart ${seriesName} was not rendered`);
  return call[0] as ChartProps;
}

function overview(overrides: Partial<RotationOverviewResult> = {}): RotationOverviewResult {
  return {
    tradeDate: '20260808',
    period: '1m',
    topGainers: [
      { name: '银行', pctChange: 4 },
      { name: '电子', pctChange: 3 },
      { name: '传媒', pctChange: 2 },
      { name: '不会展示的第四名', pctChange: 1 },
    ],
    topLosers: [
      { name: '煤炭', pctChange: -3 },
      { name: '钢铁', pctChange: -2 },
    ],
    avgPctChange: 1.25,
    riseCount: 24,
    fallCount: 7,
    totalCount: 31,
    ...overrides,
  };
}

function valuation(): SectorValuationResult {
  return {
    tradeDate: '20260808',
    sectors: [
      {
        name: '低 PE',
        peTtm: 10,
        pbMrq: 2,
        pePercentile: 20,
        pbPercentile: 90,
        pePercentile3y: null,
        pbPercentile3y: 85,
      },
      {
        name: '中位',
        peTtm: 20,
        pbMrq: 1.5,
        pePercentile: 50,
        pbPercentile: 60,
        pePercentile3y: 55,
        pbPercentile3y: 65,
      },
      {
        name: '高 PE',
        peTtm: 30,
        pbMrq: 1,
        pePercentile: 80,
        pbPercentile: 20,
        pePercentile3y: 75,
        pbPercentile3y: 25,
      },
      {
        name: '仅 PB',
        peTtm: null,
        pbMrq: null,
        pePercentile: null,
        pbPercentile: 10,
        pePercentile3y: null,
        pbPercentile3y: null,
      },
    ],
  };
}

function RefreshHarness({ children }: { children: (refreshKey: number) => ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setRefreshKey((key) => key + 1)}>
        触发刷新
      </button>
      {children(refreshKey)}
    </>
  );
}

describe('RotationOverviewCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('按交易周期请求全行业统计，格式化日期并只展示真实 Top 3', async () => {
    const pending = deferred<RotationOverviewResult>();
    apiMock.fetchRotationOverview.mockReturnValue(pending.promise);
    const { container } = renderWithProviders(
      <RotationOverviewCards tradeDate="20260808" period="1m" />
    );

    expect(container.querySelectorAll('.MuiSkeleton-root')).toHaveLength(4);
    expect(apiMock.fetchRotationOverview).toHaveBeenCalledWith({
      trade_date: '20260808',
      period_days: 20,
    });

    await act(async () => {
      pending.resolve(overview());
      await pending.promise;
    });

    expect(screen.getByText('+1.25%')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-08 · 1月 区间/)).toBeInTheDocument();
    expect(screen.getByText('银行')).toBeInTheDocument();
    expect(screen.getByText('传媒')).toBeInTheDocument();
    expect(screen.queryByText('不会展示的第四名')).not.toBeInTheDocument();
  });

  it('失败后可由共享 refreshKey 恢复，null 均保持占位而非伪造成零', async () => {
    apiMock.fetchRotationOverview
      .mockRejectedValueOnce(new Error('轮动总览不可用'))
      .mockResolvedValueOnce(
        overview({
          tradeDate: null,
          topGainers: [],
          topLosers: [],
          avgPctChange: null,
          riseCount: 0,
          fallCount: 0,
          totalCount: 0,
        })
      );
    const { user } = renderWithProviders(
      <RefreshHarness>
        {(refreshKey) => (
          <RotationOverviewCards period="1y" refreshKey={refreshKey} />
        )}
      </RefreshHarness>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('轮动总览不可用');
    await user.click(screen.getByRole('button', { name: '触发刷新' }));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText('最新交易日 · 1月 区间')).toBeInTheDocument();
    expect(screen.getAllByText('暂无数据')).toHaveLength(2);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(apiMock.fetchRotationOverview).toHaveBeenNthCalledWith(1, {
      trade_date: undefined,
      period_days: 250,
    });
    expect(apiMock.fetchRotationOverview).toHaveBeenCalledTimes(2);
  });
});

describe('RotationValuationChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('过滤 null、按分位排序并把柱点击映射到正确行业', async () => {
    apiMock.fetchSectorValuation.mockResolvedValue(valuation());
    const onSectorClick = vi.fn();
    const { user } = renderWithProviders(
      <RotationValuationChart tradeDate="20260808" onSectorClick={onSectorClick} />
    );

    await screen.findByTestId('chart');
    expect(apiMock.fetchSectorValuation).toHaveBeenCalledWith({
      trade_date: '20260808',
      sort_by: 'pe_percentile_1y',
      order: 'asc',
    });
    expect(screen.getByText('估值数据截至 2026-08-08')).toBeInTheDocument();

    const peChart = latestChart('PE分位');
    expect(peChart.series[0].data).toEqual([20, 50, 80]);
    expect(peChart.options.xaxis?.categories).toEqual(['低 PE', '中位', '高 PE']);
    expect(new Set(peChart.options.colors)).toHaveLength(3);
    expect(peChart.options.tooltip?.custom?.({ dataPointIndex: 0 })).toContain('PE_TTM：10.00');
    expect(peChart.options.tooltip?.custom?.({ dataPointIndex: 0 })).toContain('3年分位：-');
    peChart.options.chart?.events?.dataPointSelection?.(null, null, { dataPointIndex: 0 });
    expect(onSectorClick).toHaveBeenCalledWith('低 PE');

    await user.click(screen.getByRole('tab', { name: 'PB 分位' }));
    await waitFor(() => expect(latestChart('PB分位').series[0].data).toEqual([10, 20, 60, 90]));
    expect(latestChart('PB分位').options.xaxis?.categories).toEqual([
      '仅 PB',
      '高 PE',
      '中位',
      '低 PE',
    ]);
  });

  it('错误由 refreshKey 重试，成功空响应显示明确空态', async () => {
    apiMock.fetchSectorValuation
      .mockRejectedValueOnce(new Error('估值服务不可用'))
      .mockResolvedValueOnce({ tradeDate: null, sectors: [] });
    const { user } = renderWithProviders(
      <RefreshHarness>
        {(refreshKey) => <RotationValuationChart refreshKey={refreshKey} />}
      </RefreshHarness>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('估值服务不可用');
    await user.click(screen.getByRole('button', { name: '触发刷新' }));

    expect(await screen.findByText('暂无估值分位数据')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(apiMock.fetchSectorValuation).toHaveBeenCalledTimes(2);
  });
});

describe('rotation detail trend charts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('收益趋势格式化 YYYYMMDD，缺基准时不伪造沪深300序列', () => {
    const data: RotationDetailResult['returnTrend'] = [
      {
        tradeDate: '20260807',
        close: null,
        pctChange: null,
        cumReturn: 1.234,
        benchmarkReturn: null,
      },
      {
        tradeDate: '20260808',
        close: 123,
        pctChange: -0.5,
        cumReturn: -2.345,
        benchmarkReturn: null,
      },
    ];
    renderWithProviders(<RotationReturnTrendChart data={data} />);

    expect(screen.getByRole('alert')).toHaveTextContent('后端暂未提供沪深300基准收益');
    const chart = latestChart('行业');
    expect(chart.series).toEqual([{ name: '行业', data: [1.234, -2.345] }]);
    expect(chart.options.xaxis?.categories).toEqual(['2026-08-07', '2026-08-08']);
    expect(chart.options.tooltip?.y?.formatter?.(1.234)).toBe('1.23%');
  });

  it('资金趋势把元换算成亿元并保留正负，空数组显示空态', () => {
    const flowData: RotationDetailResult['flowTrend'] = [
      { tradeDate: '20260807', netInflow: 250_000_000, cumulativeInflow: 250_000_000 },
      { tradeDate: '20260808', netInflow: -100_000_000, cumulativeInflow: 150_000_000 },
    ];
    const flow = renderWithProviders(<RotationFlowTrendChart data={flowData} />);

    const chart = latestChart('每日净流入');
    expect(chart.series).toEqual([
      { name: '每日净流入', type: 'column', data: [2.5, -1] },
      { name: '累计净流入', type: 'line', data: [2.5, 1.5] },
    ]);
    expect(chart.options.xaxis?.categories).toEqual(['2026-08-07', '2026-08-08']);
    flow.unmount();

    renderWithProviders(<RotationFlowTrendChart data={[]} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });
});
