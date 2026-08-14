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

  it('renders missing amounts as placeholders without fake zero sparklines', () => {
    const { container } = renderWithProviders(
      <MarketHsgtMiniCard
        loading={false}
        error=""
        history={[
          {
            tradeDate: null,
            northMoney: null,
            southMoney: null,
            hgt: null,
            sgt: null,
            ggtSs: null,
            ggtSz: null,
          },
        ]}
      />
    );

    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(container).not.toHaveTextContent('-亿');
    expect(container).not.toHaveTextContent('—亿');
    expect(container.querySelector('polyline')).not.toBeInTheDocument();
  });

  it('keeps null history points as sparkline gaps', () => {
    const { container } = renderWithProviders(
      <MarketHsgtMiniCard
        loading={false}
        error=""
        history={[
          flowItem('20260805', 100, 40, 60),
          flowItem('20260806', null, null, null),
          flowItem('20260807', 300, 120, 180),
          flowItem('20260808', 400, 160, 240),
        ]}
      />
    );

    const lines = Array.from(container.querySelectorAll('polyline'));
    expect(lines).toHaveLength(3);
    lines.forEach((line) => {
      expect(line.getAttribute('points')?.trim().split(/\s+/)).toHaveLength(2);
    });
  });
});

function flowItem(
  tradeDate: string,
  northMoney: number | null,
  hgt: number | null,
  sgt: number | null
) {
  return {
    tradeDate,
    northMoney,
    southMoney: null,
    hgt,
    sgt,
    ggtSs: null,
    ggtSz: null,
  };
}
