import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockGetPnlToday } = vi.hoisted(() => ({
  mockGetPnlToday: vi.fn(),
}));

vi.mock('src/api/portfolio', () => ({
  getPnlToday: mockGetPnlToday,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));

import { PortfolioPnlTodayCard } from '../portfolio-pnl-today-card';

describe('PortfolioPnlTodayCard', () => {
  it('只有首个快照时不把累计盈亏展示为今日盈亏', async () => {
    mockGetPnlToday.mockResolvedValue({
      tradeDate: '2026-08-28T00:00:00.000Z',
      todayPnl: 999,
      todayPnlPct: 0.0999,
      byHolding: [],
      qualityFlags: ['DAILY_PNL_NOT_READY'],
    });

    renderWithProviders(<PortfolioPnlTodayCard portfolioId="portfolio-1" />);

    expect(await screen.findByText(/缺少上一交易日净值快照/)).toBeVisible();
    expect(screen.queryByText('+¥999')).not.toBeInTheDocument();
    expect(screen.queryByText('+9.99%')).not.toBeInTheDocument();
  });
});
