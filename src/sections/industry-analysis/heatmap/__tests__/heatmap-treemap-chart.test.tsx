import type { HeatmapItem, HeatmapDistribution } from 'src/api/heatmap';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { HeatmapTreemapChart } from '../heatmap-treemap-chart';

type TreemapSeries = Array<{
  name: string;
  data: Array<{ x: string; y: number; fillColor: string }>;
}>;

type ChartProps = {
  type: string;
  series: TreemapSeries;
  options: {
    dataLabels: { formatter: (text: string) => string | string[] };
    tooltip: {
      custom: (input: {
        seriesIndex: number;
        dataPointIndex: number;
        w: { config: { series: TreemapSeries } };
      }) => string;
    };
  };
};

const chartState = vi.hoisted(() => ({ props: null as unknown }));

vi.mock('src/components/chart', () => ({
  Chart: (props: unknown) => {
    chartState.props = props;
    return <div data-testid="treemap-chart" />;
  },
  useChart: (options: unknown) => options,
}));

function item(index: number, overrides: Partial<HeatmapItem> = {}): HeatmapItem {
  return {
    tsCode: `${String(index).padStart(6, '0')}.SZ`,
    name: `股票${index}`,
    groupName: index % 2 === 0 ? '银行' : '电子',
    industry: index % 2 === 0 ? '银行' : '电子',
    pctChg: index % 2 === 0 ? 1.2 : -1.2,
    totalMv: 1_000 - index,
    amount: index * 10,
    ...overrides,
  };
}

const distribution: HeatmapDistribution = {
  limitUp: 3,
  limitDown: 2,
  upCount: 60,
  downCount: 35,
  flatCount: 5,
  missingCount: 1,
  ranges: [],
};

function chartProps(): ChartProps {
  return chartState.props as ChartProps;
}

function flattened(series: TreemapSeries) {
  return series.flatMap((group) => group.data);
}

describe('HeatmapTreemapChart', () => {
  beforeEach(() => {
    chartState.props = null;
  });

  it('区分 loading、error 与 empty，不在远程状态下残留图表', () => {
    const loading = renderWithProviders(
      <HeatmapTreemapChart
        items={[]}
        distribution={null}
        loading
        error=""
        groupBy="industry"
        sizeBy="totalMv"
      />
    );
    expect(loading.container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    expect(screen.queryByTestId('treemap-chart')).not.toBeInTheDocument();
    loading.unmount();

    const failed = renderWithProviders(
      <HeatmapTreemapChart
        items={[]}
        distribution={null}
        loading={false}
        error="热力图服务不可用"
        groupBy="industry"
        sizeBy="totalMv"
      />
    );
    expect(screen.getByText('热力图服务不可用')).toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
    failed.unmount();

    renderWithProviders(
      <HeatmapTreemapChart
        items={[]}
        distribution={null}
        loading={false}
        error=""
        groupBy="industry"
        sizeBy="totalMv"
      />
    );
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('按市值排序分组且默认截断 100 项，允许扩到 200 并保留缺失语义', async () => {
    const items = Array.from({ length: 105 }, (_, index) => item(index));
    items[1] = item(1, {
      tsCode: '000001.SZ',
      name: null,
      groupName: null,
      industry: null,
      pctChg: null,
      totalMv: 998,
      amount: null,
    });
    const { user } = renderWithProviders(
      <HeatmapTreemapChart
        items={items}
        distribution={distribution}
        loading={false}
        error=""
        groupBy="industry"
        sizeBy="totalMv"
      />
    );

    expect(screen.getByTestId('treemap-chart')).toBeInTheDocument();
    expect(flattened(chartProps().series)).toHaveLength(100);
    expect(flattened(chartProps().series)[0].x).toBe('股票0');
    expect(chartProps().series.map((group) => group.name)).toContain('其他');
    expect(chartProps().options.dataLabels.formatter('000001.SZ')).toEqual(['000001.SZ', '—']);
    expect(screen.getByText('涨停 3')).toBeInTheDocument();
    expect(screen.getByText('缺失 1')).toBeInTheDocument();

    const fallbackGroupIndex = chartProps().series.findIndex((group) => group.name === '其他');
    const fallbackPointIndex = chartProps().series[fallbackGroupIndex].data.findIndex(
      (point) => point.x === '000001.SZ'
    );
    const tooltip = chartProps().options.tooltip.custom({
      seriesIndex: fallbackGroupIndex,
      dataPointIndex: fallbackPointIndex,
      w: { config: { series: chartProps().series } },
    });
    expect(tooltip).toContain('000001.SZ');
    expect(tooltip).toContain('分组：</span>-');
    expect(tooltip).toContain('成交额：</span>—');

    await user.click(screen.getByRole('button', { name: '200' }));
    expect(flattened(chartProps().series)).toHaveLength(105);
  });

  it('指数模式按成交额排序，图表 formatter 与 tooltip 使用 A 股符号和亿元单位', () => {
    renderWithProviders(
      <HeatmapTreemapChart
        items={[
          item(1, { name: '低成交', amount: null, pctChg: -2.34 }),
          item(2, { name: '高成交', amount: 2_000_000, pctChg: 1.25 }),
          item(3, { name: '平盘', amount: 10, pctChg: 0 }),
        ]}
        distribution={{ ...distribution, missingCount: 0 }}
        loading={false}
        error=""
        groupBy="index"
        sizeBy="amount"
      />
    );

    expect(chartProps().series).toHaveLength(1);
    expect(chartProps().series[0].name).toBe('成分股');
    expect(chartProps().series[0].data.map((point) => point.x)).toEqual([
      '高成交',
      '平盘',
      '低成交',
    ]);
    expect(chartProps().series[0].data[2].y).toBe(1);
    expect(chartProps().options.dataLabels.formatter('平盘')).toEqual(['平盘', '+0.0%']);
    expect(screen.queryByText(/缺失/)).not.toBeInTheDocument();

    const tooltip = chartProps().options.tooltip.custom({
      seriesIndex: 0,
      dataPointIndex: 0,
      w: { config: { series: chartProps().series } },
    });
    expect(tooltip).toContain('+1.3%');
    expect(tooltip).toContain('20.00 亿');
  });
});
