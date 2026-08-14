/** @vitest-environment jsdom */

import { screen } from '@testing-library/react';
import { it, vi, expect, describe } from 'vitest';

import { renderWithProviders } from 'src/test/test-utils';

import { HsgtSummaryCard } from '../hsgt-summary-card';

const mocks = vi.hoisted(() => ({
  fetchHsgtFlow: vi.fn(),
}));

vi.mock('src/api/market', () => mocks);

describe('HsgtSummaryCard', () => {
  it('does not append a unit or calculate a split when a required channel is missing', async () => {
    mocks.fetchHsgtFlow.mockResolvedValue({
      tradeDate: null,
      history: [
        {
          tradeDate: null,
          northMoney: null,
          southMoney: null,
          hgt: null,
          sgt: 200,
          ggtSs: null,
          ggtSz: null,
        },
      ],
    });

    const { container } = renderWithProviders(<HsgtSummaryCard />);

    expect(await screen.findByText('+2.00亿')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(5);
    expect(container).not.toHaveTextContent('-亿');
    expect(container).not.toHaveTextContent('—亿');
    expect(container.textContent).not.toContain('%');
  });
});
