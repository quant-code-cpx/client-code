import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { HeatmapSectorBarChart } from '../heatmap-sector-bar-chart';

vi.mock('src/components/chart', () => ({
  Chart: () => <div data-testid="sector-bar-chart" />,
  useChart: (options: unknown) => options,
}));

describe('HeatmapSectorBarChart', () => {
  it('散点数据不支持真实家数时隐藏涨跌家数模式', () => {
    renderWithProviders(
      <HeatmapSectorBarChart
        sectors={[{ groupName: '银行', avgPctChg: 1.2 }]}
        supportsCount={false}
        loading={false}
        error=""
      />
    );

    expect(screen.getByTestId('sector-bar-chart')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '涨跌家数' })).not.toBeInTheDocument();
  });

  it('真实个股聚合数据保留涨跌家数模式', () => {
    renderWithProviders(
      <HeatmapSectorBarChart
        sectors={[
          {
            groupName: '银行',
            avgPctChg: 1.2,
            upCount: 10,
            downCount: 2,
            flatCount: 1,
          },
        ]}
        loading={false}
        error=""
      />
    );

    expect(screen.getByRole('button', { name: '涨跌家数' })).toBeInTheDocument();
  });
});
