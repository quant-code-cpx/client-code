/** @vitest-environment jsdom */

import { screen, waitFor } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { fetchIndexTrend } from 'src/api/market';
import { renderWithProviders } from 'src/test/test-utils';

import { MarketIndexTrendChart } from '../market-index-trend-chart';

vi.mock('src/api/market', () => ({ fetchIndexTrend: vi.fn() }));

vi.mock('src/components/chart', () => ({
  Chart: () => null,
  useChart: () => ({}),
}));

describe('MarketIndexTrendChart', () => {
  beforeEach(() => {
    vi.mocked(fetchIndexTrend).mockResolvedValue({
      tsCode: '000001.SH',
      name: '上证指数',
      period: '3m',
      data: [],
    });
  });

  it('supports STAR Composite and STAR 50 trend queries', async () => {
    const { user } = renderWithProviders(<MarketIndexTrendChart />);

    await screen.findByText('暂无数据');
    expect(screen.getByRole('tab', { name: '科创综指' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '科创50' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '科创综指' }));
    await waitFor(() => {
      expect(fetchIndexTrend).toHaveBeenLastCalledWith({ ts_code: '000680.SH', period: '3m' });
    });

    await user.click(screen.getByRole('tab', { name: '科创50' }));
    await waitFor(() => {
      expect(fetchIndexTrend).toHaveBeenLastCalledWith({ ts_code: '000688.SH', period: '3m' });
    });
  });
});
