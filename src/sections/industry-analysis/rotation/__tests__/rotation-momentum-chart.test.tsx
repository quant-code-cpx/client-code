import type { MomentumRankingResult } from 'src/api/market';

import { screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RotationMomentumChart } from '../rotation-momentum-chart';

type ChartMockProps = {
  options: {
    colors?: string[];
    dataLabels?: {
      formatter?: (value: unknown) => string;
    };
    tooltip?: {
      custom?: (input: { dataPointIndex: number }) => string;
    };
  };
};

const apiMock = vi.hoisted(() => ({
  fetchMomentumRanking: vi.fn(),
}));

const chartMock = vi.hoisted(() =>
  vi.fn((_props: ChartMockProps) => <div data-testid="rotation-momentum-chart" />)
);

vi.mock('src/api/market', () => ({
  fetchMomentumRanking: apiMock.fetchMomentumRanking,
}));

vi.mock('src/components/chart', () => ({
  Chart: chartMock,
  useChart: (options: unknown) => options,
}));

const momentumResult: MomentumRankingResult = {
  tradeDate: '20260703',
  period: 'weighted',
  rankings: [
    {
      rank: 1,
      prevRank: 0,
      amount: 0,
      rankChange: 0,
      momentum: 24.9,
      name: '橡胶助剂',
    },
    {
      rank: 2,
      prevRank: 0,
      amount: 0,
      rankChange: 0,
      momentum: -3.5,
      name: '弱势行业',
    },
  ],
};

function latestChartProps(): ChartMockProps {
  const latestCall = chartMock.mock.calls[chartMock.mock.calls.length - 1];
  if (!latestCall) throw new Error('Chart not rendered');
  return latestCall[0];
}

describe('RotationMomentumChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.fetchMomentumRanking.mockResolvedValue(momentumResult);
  });

  it('动量标签只显示百分比，不把缺失的上期排名渲染成横杆', async () => {
    renderWithProviders(<RotationMomentumChart />);

    await screen.findByTestId('rotation-momentum-chart');

    const props = latestChartProps();
    expect(props.options.dataLabels?.formatter?.(24.9)).toBe('24.90%');

    await waitFor(() => {
      const tooltipHtml = latestChartProps().options.tooltip?.custom?.({ dataPointIndex: 0 });
      expect(tooltipHtml).toContain('当前排名：1');
      expect(tooltipHtml).not.toContain('— 0');
      expect(tooltipHtml).not.toContain('上期排名：0');
    });
  });

  it('负动量柱使用与非负动量不同的主题颜色', async () => {
    renderWithProviders(<RotationMomentumChart />);

    await screen.findByTestId('rotation-momentum-chart');
    const props = latestChartProps();
    expect(props.options.colors).toHaveLength(2);
    expect(props.options.colors?.[0]).not.toBe(props.options.colors?.[1]);

    const tooltipHtml = props.options.tooltip?.custom?.({ dataPointIndex: 1 });
    expect(tooltipHtml).toContain(`color:${props.options.colors?.[1]}`);
    expect(tooltipHtml).toContain('-3.50%');
  });
});
