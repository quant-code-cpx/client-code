/** @vitest-environment jsdom */

import type { ReportListItem } from 'src/api/report';

import { useLocation } from 'react-router';
import { screen } from '@testing-library/react';
import { vi, expect, describe, beforeEach } from 'vitest';

import { listReports } from 'src/api/report';
import { renderWithProviders } from 'src/test/test-utils';
import { getPnlToday, listPortfolios } from 'src/api/portfolio';

import { DashboardRecentReports } from '../dashboard-recent-reports';
import { DashboardPortfolioGlance } from '../dashboard-portfolio-glance';

vi.mock('src/api/portfolio', () => ({
  getPnlToday: vi.fn(),
  listPortfolios: vi.fn(),
}));

vi.mock('src/api/report', () => ({
  listReports: vi.fn(),
}));

const report: ReportListItem = {
  id: 'report-1',
  type: 'BACKTEST',
  title: '月度策略复盘',
  format: 'HTML',
  status: 'COMPLETED',
  fileSize: 1024,
  createdAt: '2026-08-01T00:00:00Z',
  completedAt: '2026-08-01T00:05:00Z',
};

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

describe('overview navigation accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listPortfolios).mockResolvedValue([]);
    vi.mocked(listReports).mockResolvedValue({
      items: [report],
      total: 1,
      page: 1,
      pageSize: 5,
    });
  });

  it('exposes the portfolio glance card as a keyboard-operable link', async () => {
    const { user } = renderWithProviders(
      <>
        <DashboardPortfolioGlance />
        <LocationProbe />
      </>
    );

    const link = await screen.findByRole('link', { name: '查看我的组合' });
    expect(link).toHaveAttribute('href', '/portfolio');

    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/portfolio');
  });

  it('exposes recent reports as destination links', async () => {
    const { user } = renderWithProviders(
      <>
        <DashboardRecentReports />
        <LocationProbe />
      </>
    );

    const link = await screen.findByRole('link', { name: '查看报告：月度策略复盘' });
    expect(link).toHaveAttribute('href', '/research/report/report-1');

    await user.tab();
    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/research/report/report-1');
  });

  it('renders portfolio PnL ratios in percentage units', async () => {
    vi.mocked(listPortfolios).mockResolvedValue([
      {
        id: 'portfolio-1',
        name: '量化组合',
        description: null,
        initialCash: 10000,
        holdingCount: 1,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
      },
    ]);
    vi.mocked(getPnlToday).mockResolvedValue({
      tradeDate: '20260807',
      todayPnl: 110,
      todayPnlPct: 0.011,
      byHolding: [],
    });

    renderWithProviders(<DashboardPortfolioGlance />);

    expect(await screen.findAllByText('+1.10%')).toHaveLength(2);
  });
});
