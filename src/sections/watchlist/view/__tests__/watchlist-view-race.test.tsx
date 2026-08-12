import type { ReactNode } from 'react';
import type { WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { act, screen, waitFor } from '@testing-library/react';

import { renderWithProviders } from 'src/test/test-utils';

const { mockGetWatchlistStocks, mockGetWatchlistSummary, mockGetWatchlistOverview } = vi.hoisted(
  () => ({
    mockGetWatchlistStocks: vi.fn(),
    mockGetWatchlistSummary: vi.fn(),
    mockGetWatchlistOverview: vi.fn(),
  })
);

vi.mock('src/auth', () => ({ useAuth: () => ({ userProfile: { watchlistLimit: 10 } }) }));
vi.mock('src/api/watchlist', () => ({
  deleteWatchlist: vi.fn(),
  getWatchlistStocks: mockGetWatchlistStocks,
  getWatchlistSummary: mockGetWatchlistSummary,
  getWatchlistOverview: mockGetWatchlistOverview,
}));
vi.mock('src/layouts/dashboard', () => ({
  DashboardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('src/components/iconify', () => ({ Iconify: () => null }));
vi.mock('src/components/confirm-dialog', () => ({ ConfirmDialog: () => null }));
vi.mock('src/sections/watchlist/watchlist-health-bar', () => ({
  WatchlistHealthBar: () => null,
}));
vi.mock('src/sections/watchlist/watchlist-overview-cards', () => ({
  WatchlistOverviewCards: ({
    watchlists,
    onSelect,
  }: {
    watchlists: WatchlistOverviewItem[];
    onSelect: (id: number) => void;
  }) => (
    <div>
      {watchlists.map((watchlist) => (
        <button key={watchlist.id} type="button" onClick={() => onSelect(watchlist.id)}>
          {watchlist.name}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('src/sections/watchlist/watchlist-detail-panel', () => ({
  WatchlistDetailPanel: ({
    watchlist,
    stocks,
    stocksLoading,
  }: {
    watchlist: WatchlistOverviewItem;
    stocks: WatchlistStock[];
    stocksLoading: boolean;
  }) => (
    <div data-testid="stocks-panel">
      {watchlist.name}:{stocksLoading ? 'loading' : 'idle'}:
      {stocks.map((stock) => stock.tsCode).join(',')}
    </div>
  ),
}));
vi.mock('src/sections/watchlist/watchlist-edit-dialog', () => ({
  WatchlistEditDialog: () => null,
}));
vi.mock('src/sections/watchlist/watchlist-create-dialog', () => ({
  WatchlistCreateDialog: () => null,
}));
vi.mock('src/sections/watchlist/watchlist-add-stock-dialog', () => ({
  WatchlistAddStockDialog: () => null,
}));

import { WatchlistView } from '../watchlist-view';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function watchlistFixture(id: number, name: string, isDefault = false): WatchlistOverviewItem {
  return {
    id,
    name,
    isDefault,
    description: null,
    sortOrder: id,
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    summary: {
      stockCount: 1,
      upCount: 0,
      downCount: 0,
      flatCount: 1,
      avgPctChg: 0,
      totalMv: 0,
    },
  };
}

function stockFixture(id: number, tsCode: string): WatchlistStock {
  return {
    id,
    tsCode,
    notes: null,
    tags: [],
    targetPrice: null,
    sortOrder: id,
    addedAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    quote: null,
  };
}

describe('WatchlistView stock request coordination', () => {
  it('切组后忽略旧组响应，且旧请求完成不能提前结束当前 loading', async () => {
    const firstStocks = deferred<{ stocks: WatchlistStock[] }>();
    const secondStocks = deferred<{ stocks: WatchlistStock[] }>();
    mockGetWatchlistOverview.mockResolvedValue({
      watchlists: [watchlistFixture(1, '第一组', true), watchlistFixture(2, '第二组')],
    });
    mockGetWatchlistStocks
      .mockReturnValueOnce(firstStocks.promise)
      .mockReturnValueOnce(secondStocks.promise);
    const { user } = renderWithProviders(<WatchlistView />);

    await waitFor(() => expect(mockGetWatchlistStocks).toHaveBeenCalledWith(1));
    await user.click(screen.getByRole('button', { name: '第二组' }));
    await waitFor(() => expect(mockGetWatchlistStocks).toHaveBeenCalledWith(2));

    await act(async () => {
      firstStocks.resolve({ stocks: [stockFixture(1, '000001.SZ')] });
      await firstStocks.promise;
    });
    expect(screen.getByTestId('stocks-panel')).toHaveTextContent('第二组:loading:');
    expect(screen.getByTestId('stocks-panel')).not.toHaveTextContent('000001.SZ');

    await act(async () => {
      secondStocks.resolve({ stocks: [stockFixture(2, '600000.SH')] });
      await secondStocks.promise;
    });
    await waitFor(() =>
      expect(screen.getByTestId('stocks-panel')).toHaveTextContent('第二组:idle:600000.SH')
    );
    expect(mockGetWatchlistStocks).toHaveBeenCalledTimes(2);
  });
});
