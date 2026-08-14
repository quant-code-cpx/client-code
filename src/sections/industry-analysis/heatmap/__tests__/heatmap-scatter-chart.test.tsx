import type { SectorFlowItem } from 'src/api/market';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { HeatmapScatterChart } from '../heatmap-scatter-chart';

const chartMock = vi.hoisted(() => ({ props: null as unknown }));

vi.mock('src/components/chart', () => ({
  Chart: (props: unknown) => {
    chartMock.props = props;
    return <div data-testid="scatter-chart" />;
  },
  useChart: (options: unknown) => options,
}));

function sector(overrides: Partial<SectorFlowItem> = {}): SectorFlowItem {
  return {
    tsCode: 'BK0475.DC',
    tradeDate: '20260808',
    contentType: 'INDUSTRY',
    name: '银行',
    pctChange: 1,
    close: null,
    netAmount: 200_000_000,
    netAmountRate: 1,
    buyElgAmount: null,
    buyElgAmountRate: null,
    buyLgAmount: null,
    buyLgAmountRate: null,
    buyMdAmount: null,
    buyMdAmountRate: null,
    buySmAmount: null,
    buySmAmountRate: null,
    buySmAmountStock: null,
    rank: 1,
    ...overrides,
  };
}

describe('HeatmapScatterChart', () => {
  it('只绘制真实 X/Y 坐标并使用固定气泡尺寸，tooltip 不展示虚构统计', () => {
    renderWithProviders(
      <HeatmapScatterChart
        sectors={[
          sector(),
          sector({ tsCode: 'NO_PCT', name: '缺涨跌幅', pctChange: null }),
          sector({ tsCode: 'NO_FLOW', name: '缺净流入', netAmount: null }),
        ]}
        topGainersByGroup={{}}
        topInflowByGroup={{}}
        loading={false}
        error=""
      />
    );

    expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
    expect(screen.getByText('1 个板块')).toBeInTheDocument();
    expect(screen.queryByText('缺涨跌幅')).not.toBeInTheDocument();
    expect(screen.queryByText('缺净流入')).not.toBeInTheDocument();

    const props = chartMock.props as {
      series: Array<{ data: Array<[number, number, number]> }>;
      options: {
        tooltip: {
          custom: (point: { seriesIndex: number; dataPointIndex: number }) => string;
        };
      };
    };
    expect(props.series.flatMap((item) => item.data)).toEqual([[1, 2, 1]]);

    const tooltip = props.options.tooltip.custom({ seriesIndex: 0, dataPointIndex: 0 });
    expect(tooltip).toContain('银行');
    expect(tooltip).toContain('净流入');
    expect(tooltip).not.toContain('成交额');
    expect(tooltip).not.toContain('上涨');
    expect(tooltip).not.toContain('领涨');
  });
});
