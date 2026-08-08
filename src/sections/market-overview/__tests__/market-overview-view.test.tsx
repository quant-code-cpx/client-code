/** @vitest-environment jsdom */

import type { ReactNode } from 'react';

import { screen, waitFor } from '@testing-library/react';
import { it, vi, expect, describe, beforeEach } from 'vitest';

import { fetchHsgtFlow } from 'src/api/market';
import { renderWithProviders } from 'src/test/test-utils';

import { MarketOverviewView } from '../view/market-overview-view';

vi.mock('src/api/market', () => ({ fetchHsgtFlow: vi.fn() }));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/date-picker', () => ({ DatePicker: () => null }));
vi.mock('src/sections/market-overview/market-quick-links', () => ({ MarketQuickLinks: () => null }));
vi.mock('src/sections/market-overview/market-volume-chart', () => ({ MarketVolumeChart: () => null }));
vi.mock('src/sections/market-overview/market-sector-panel', () => ({ MarketSectorPanel: () => null }));
vi.mock('src/sections/market-overview/market-hsgt-mini-card', () => ({
  MarketHsgtMiniCard: () => null,
}));
vi.mock('src/sections/market-overview/market-valuation-card', () => ({
  MarketValuationCard: () => null,
}));
vi.mock('src/sections/market-overview/market-hero-narrative', () => ({
  MarketHeroNarrative: () => null,
}));
vi.mock('src/sections/market-overview/market-index-trend-chart', () => ({
  MarketIndexTrendChart: () => null,
}));
vi.mock('src/sections/market-overview/market-daily-snapshot-card', () => ({
  MarketDailySnapshotCard: () => null,
}));
vi.mock('src/sections/market-overview/market-change-distribution-chart', () => ({
  MarketChangeDistributionChart: () => null,
}));

describe('MarketOverviewView HSGT request ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchHsgtFlow).mockResolvedValue({ tradeDate: null, history: [] });
  });

  it('issues one HSGT request per load or explicit refresh', async () => {
    const { user } = renderWithProviders(<MarketOverviewView />);

    await waitFor(() => expect(fetchHsgtFlow).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: '刷新数据' }));

    await waitFor(() => expect(fetchHsgtFlow).toHaveBeenCalledTimes(2));
  });
});
