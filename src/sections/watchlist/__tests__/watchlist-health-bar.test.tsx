import type { WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { screen, fireEvent } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { WatchlistHealthBar } from '../watchlist-health-bar';

const group: WatchlistOverviewItem = {
  id: 1,
  name: '核心持仓',
  description: null,
  isDefault: true,
  sortOrder: 0,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  summary: {
    stockCount: 2,
    upCount: 1,
    downCount: 0,
    flatCount: 1,
    avgPctChg: 0.5,
    totalMv: 100,
  },
};

function stock(overrides: Partial<WatchlistStock>): WatchlistStock {
  return {
    id: 1,
    tsCode: '600519.SH',
    notes: null,
    tags: [],
    targetPrice: null,
    sortOrder: 0,
    addedAt: '2026-08-01T00:00:00Z',
    updatedAt: '2026-08-01T00:00:00Z',
    quote: null,
    ...overrides,
  };
}

describe('WatchlistHealthBar', () => {
  it('统计容量、最新交易日、目标触达与行情缺失，并格式化 YYYYMMDD', () => {
    renderWithProviders(
      <WatchlistHealthBar
        watchlists={[group]}
        selectedWatchlist={group}
        groupLimit={10}
        stocks={[
          stock({
            id: 1,
            targetPrice: 10,
            quote: {
              close: 12,
              pctChg: 1,
              vol: null,
              amount: null,
              pe: null,
              pb: null,
              totalMv: null,
              tradeDate: '20260811',
            },
          }),
          stock({ id: 2, tsCode: '000001.SZ', quote: null }),
          stock({
            id: 3,
            tsCode: '600036.SH',
            quote: {
              close: 20,
              pctChg: 0,
              vol: null,
              amount: null,
              pe: null,
              pb: null,
              totalMv: null,
              tradeDate: '20260812',
            },
          }),
        ]}
        onClickTargetHit={vi.fn()}
        onClickQuoteMissing={vi.fn()}
      />
    );

    expect(screen.getByText('1 / 10')).toBeInTheDocument();
    expect(screen.getByText('2 / 200')).toBeInTheDocument();
    expect(screen.getByText('2026-08-12')).toBeInTheDocument();
    expect(screen.queryByText('20260812')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '触达目标：1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '行情缺失：1' })).toBeInTheDocument();
  });

  it('仅有异常时可点击，并支持 Enter/Space 键盘下钻', () => {
    const onHit = vi.fn();
    const onMissing = vi.fn();
    renderWithProviders(
      <WatchlistHealthBar
        watchlists={[group]}
        selectedWatchlist={group}
        groupLimit={-1}
        stocks={[stock({ targetPrice: 10, quote: { close: 11 } as never }), stock({ id: 2 })]}
        onClickTargetHit={onHit}
        onClickQuoteMissing={onMissing}
      />
    );

    expect(screen.getByText('1 / ∞')).toBeInTheDocument();
    const hit = screen.getByRole('button', { name: '触达目标：1' });
    fireEvent.keyDown(hit, { key: 'Enter' });
    fireEvent.keyDown(hit, { key: ' ' });
    expect(onHit).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: '行情缺失：1' }));
    expect(onMissing).toHaveBeenCalledOnce();
  });

  it('无选中组和无异常时展示中性占位且不伪造按钮', () => {
    renderWithProviders(
      <WatchlistHealthBar watchlists={[]} selectedWatchlist={null} stocks={[]} groupLimit={null} />
    );

    expect(screen.getByText('0 / 10')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /触达目标/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /行情缺失/ })).not.toBeInTheDocument();
  });
});
