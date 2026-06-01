import type { TimingScoreSummary } from 'src/api/stock';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { AnalysisTimingScoreCard } from '../analysis-timing-score-card';

type TimingScoreChartOptions = {
  plotOptions?: {
    radialBar?: {
      dataLabels?: {
        value?: {
          show?: boolean;
          offsetY?: number;
        };
      };
    };
  };
};

type ChartMockProps = {
  options: TimingScoreChartOptions;
};

const chartMock = vi.hoisted(() =>
  vi.fn((_props: ChartMockProps) => <div data-testid="timing-score-chart" />)
);

vi.mock('src/components/chart', () => ({
  Chart: chartMock,
  useChart: (options: unknown) => options,
}));

const scoreSummary: TimingScoreSummary = {
  score: 43,
  rating: 'neutral',
  bullishCount: 1,
  bearishCount: 5,
  neutralCount: 4,
  details: [],
};

describe('AnalysisTimingScoreCard', () => {
  beforeEach(() => {
    chartMock.mockClear();
  });

  it('将评分数字渲染在圆环覆盖层中心，而不是使用 ApexCharts 偏移标签', () => {
    renderWithProviders(<AnalysisTimingScoreCard scoreSummary={scoreSummary} />);

    expect(screen.getByTestId('timing-score-center-value')).toHaveTextContent('43');

    const chartOptions = chartMock.mock.calls[0]?.[0].options;
    expect(chartOptions?.plotOptions?.radialBar?.dataLabels?.value?.show).toBe(false);
    expect(chartOptions?.plotOptions?.radialBar?.dataLabels?.value?.offsetY).toBeUndefined();
  });
});
