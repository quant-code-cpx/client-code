/** @vitest-environment jsdom */

import type { PropsWithChildren } from 'react';
import type { BacktestRunListItem } from 'src/api/backtest';

import { useLocation } from 'react-router';
import { screen } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { listRuns } from 'src/api/backtest';
import { renderWithProviders } from 'src/test/test-utils';

import { DashboardRecentBacktests } from '../dashboard-recent-backtests';

vi.mock('src/api/backtest', () => ({ listRuns: vi.fn() }));

vi.mock('src/components/scrollbar', () => ({
  Scrollbar: ({ children }: PropsWithChildren) => (
    <div className="simplebar-content-wrapper">{children}</div>
  ),
}));

const runs: BacktestRunListItem[] = Array.from({ length: 5 }, (_, index) => ({
  runId: `run-${index}`,
  jobId: null,
  name: `回测 ${index + 1}`,
  strategyType: 'MA_CROSS_SINGLE',
  status: 'COMPLETED',
  startDate: '20260101',
  endDate: '20260701',
  benchmarkTsCode: '000300.SH',
  totalReturn: null,
  annualizedReturn: 0.1,
  maxDrawdown: -0.05,
  sharpeRatio: 1.2,
  progress: 100,
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
}));

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

describe('DashboardRecentBacktests', () => {
  beforeEach(() => {
    vi.mocked(listRuns).mockResolvedValue({
      page: 1,
      pageSize: 5,
      total: runs.length,
      items: runs,
    });
  });

  it('keeps new-backtest action outside scrollable recent runs', async () => {
    renderWithProviders(<DashboardRecentBacktests />);

    await screen.findByText('回测 5');

    expect(listRuns).toHaveBeenCalledWith({ page: 1, pageSize: 5 });
    expect(screen.getByText('回测 1').closest('.simplebar-content-wrapper')).not.toBeNull();
    expect(
      screen.getByRole('link', { name: '新建回测' }).closest('.simplebar-content-wrapper')
    ).toBeNull();
  });

  it('exposes every recent run as a destination link', async () => {
    const { user } = renderWithProviders(
      <>
        <DashboardRecentBacktests />
        <LocationProbe />
      </>,
      { initialEntries: ['/'] }
    );

    const link = await screen.findByRole('link', { name: '查看回测：回测 1' });
    expect(link).toHaveAttribute('href', '/backtest/runs/run-0');

    await user.tab();
    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('location')).toHaveTextContent('/backtest/runs/run-0');
  });
});
