import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { RotationReturnComparisonChart } from '../rotation-return-comparison-chart';

const apiMock = vi.hoisted(() => ({ fetchReturnComparison: vi.fn() }));

vi.mock('src/api/market', () => ({ fetchReturnComparison: apiMock.fetchReturnComparison }));
vi.mock('src/components/chart', () => ({
  Chart: () => <div data-testid="rotation-return-comparison-chart" />,
  useChart: () => ({}),
}));

describe('RotationReturnComparisonChart', () => {
  it('keeps industry data visible and explicitly marks the missing benchmark', async () => {
    apiMock.fetchReturnComparison.mockResolvedValueOnce({
      period: '20',
      benchmark: null,
      sectors: [
        {
          name: '银行',
          data: [{ tradeDate: '20d', cumReturn: 3.2 }],
        },
      ],
    });

    renderWithProviders(<RotationReturnComparisonChart period="1m" />);

    expect(
      await screen.findByText('后端暂未提供沪深300基准收益，当前仅展示行业收益。')
    ).toBeInTheDocument();
    expect(screen.getByTestId('rotation-return-comparison-chart')).toBeInTheDocument();
  });
});
