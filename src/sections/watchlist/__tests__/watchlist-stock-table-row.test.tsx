import type { WatchlistStock } from 'src/api/watchlist';

import { screen } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

import { WatchlistStockTableRow } from '../watchlist-stock-table-row';

const createWatchlistStock = (overrides?: Partial<WatchlistStock>): WatchlistStock => ({
  id: 1,
  tsCode: '000001.SZ',
  stockName: '平安银行',
  industry: '银行',
  area: '深圳',
  notes: null,
  tags: [],
  targetPrice: null,
  sortOrder: 0,
  addedAt: '2026-06-26T00:00:00.000Z',
  updatedAt: '2026-06-26T00:00:00.000Z',
  quote: {
    close: 12.34,
    pctChg: 1.23,
    vol: 100000,
    amount: 123456,
    pe: 8.9,
    pb: 0.8,
    totalMv: 1000000,
    tradeDate: '20260626',
  },
  ...overrides,
});

const DRAG_DISABLED = true;

describe('WatchlistStockTableRow', () => {
  it('展示股票名称作为主识别信息，并保留代码作为辅助信息', () => {
    renderWithProviders(
      <table>
        <tbody>
          <WatchlistStockTableRow
            row={createWatchlistStock()}
            selected={false}
            dragDisabled={DRAG_DISABLED}
            onSelect={vi.fn()}
            onEdit={vi.fn()}
            onRemove={vi.fn()}
          />
        </tbody>
      </table>
    );

    expect(screen.getByRole('link', { name: '平安银行' })).toHaveAttribute(
      'href',
      '/stock/detail?code=000001.SZ'
    );
    expect(screen.getByText('000001.SZ')).toBeInTheDocument();
  });

  it('股票名称缺失时仍使用代码兜底，避免空白名称列', () => {
    renderWithProviders(
      <table>
        <tbody>
          <WatchlistStockTableRow
            row={createWatchlistStock({ stockName: null })}
            selected={false}
            dragDisabled={DRAG_DISABLED}
            onSelect={vi.fn()}
            onEdit={vi.fn()}
            onRemove={vi.fn()}
          />
        </tbody>
      </table>
    );

    expect(screen.getByRole('link', { name: '000001.SZ' })).toBeInTheDocument();
  });
});
