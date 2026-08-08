import type { HeatmapDistribution } from 'src/api/heatmap';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { HeatmapDistributionChart } from '../heatmap-distribution-chart';

const distribution: HeatmapDistribution = {
  limitUp: 1,
  limitDown: 1,
  upCount: 12,
  downCount: 8,
  flatCount: 2,
  ranges: Array.from({ length: 21 }, (_, index) => ({
    range: `${index - 10}~${index - 9}`,
    count: index === 10 ? 2 : 1,
  })),
};

describe('HeatmapDistributionChart', () => {
  it('默认展示紧凑 21 档分布，明细按需展开且总数只取 21 桶合计', async () => {
    const { user } = renderWithProviders(
      <HeatmapDistributionChart distribution={distribution} loading={false} error="" />
    );

    expect(screen.getByRole('region', { name: '21档涨跌幅分布' })).toBeInTheDocument();
    expect(screen.getByText('总数 22')).toBeInTheDocument();
    expect(screen.getByText('区间明细')).not.toBeVisible();

    const detailButton = screen.getByRole('button', { name: '展开 21 档区间明细' });
    expect(detailButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(detailButton);

    expect(screen.getByText('区间明细')).toBeVisible();
    expect(screen.getByText('9~10%')).toBeInTheDocument();
    expect(detailButton).toHaveAttribute('aria-expanded', 'true');
  });
});
