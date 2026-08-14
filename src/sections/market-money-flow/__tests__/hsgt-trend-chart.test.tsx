/** @vitest-environment jsdom */

import { it, vi, expect, describe } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { HsgtTrendChart } from '../hsgt-trend-chart';

const mocks = vi.hoisted(() => ({
  fetchHsgtTrend: vi.fn(),
}));

vi.mock('src/api/market', () => mocks);

vi.mock('src/components/chart', () => ({
  useChart: <T,>(options: T) => options,
  Chart: ({ series }: { series: unknown }) => (
    <pre data-testid="hsgt-series">{JSON.stringify(series)}</pre>
  ),
}));

describe('HsgtTrendChart', () => {
  it('passes missing totals and channels to the chart as null gaps', async () => {
    mocks.fetchHsgtTrend.mockResolvedValue({
      period: '3m',
      data: [
        {
          tradeDate: '2026-08-07',
          northMoney: null,
          southMoney: null,
          hgt: null,
          sgt: 100,
          ggtSs: null,
          ggtSz: null,
          cumulativeNorth: 0,
          cumulativeSouth: 0,
        },
        {
          tradeDate: '2026-08-08',
          northMoney: 250,
          southMoney: 300,
          hgt: 100,
          sgt: 150,
          ggtSs: 120,
          ggtSz: 180,
          cumulativeNorth: 250,
          cumulativeSouth: 300,
        },
      ],
    });

    renderWithProviders(<HsgtTrendChart />);

    expect(await screen.findByTestId('hsgt-series')).toHaveTextContent(
      '"data":[null,2.5]'
    );

    fireEvent.click(screen.getByRole('button', { name: '通道拆分' }));
    expect(screen.getByTestId('hsgt-series')).toHaveTextContent('"data":[null,1]');
    expect(screen.getByTestId('hsgt-series')).toHaveTextContent('"data":[1,1.5]');
  });
});
