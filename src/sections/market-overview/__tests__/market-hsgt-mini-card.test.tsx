/** @vitest-environment jsdom */

import { screen } from '@testing-library/react';
import { it, vi, expect, describe } from 'vitest';

import { fetchHsgtFlow } from 'src/api/market';
import { renderWithProviders } from 'src/test/test-utils';

import { MarketHsgtMiniCard } from '../market-hsgt-mini-card';

vi.mock('src/api/market', () => ({ fetchHsgtFlow: vi.fn() }));

describe('MarketHsgtMiniCard', () => {
  it('renders parent-owned history without triggering a fallback request', () => {
    renderWithProviders(
      <MarketHsgtMiniCard
        loading={false}
        error=""
        history={[
          {
            tradeDate: '20260808',
            northMoney: 1234,
            southMoney: null,
            hgt: 600,
            sgt: 634,
            ggtSs: null,
            ggtSz: null,
          },
        ]}
      />
    );

    expect(screen.getByText('合计北向（今日）')).toBeInTheDocument();
    expect(screen.getByText('+12.34亿')).toBeInTheDocument();
    expect(fetchHsgtFlow).not.toHaveBeenCalled();
  });
});
