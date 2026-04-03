import { apiClient } from './client';

export type Watchlist = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count: { stocks: number };
};

export type StockQuote = {
  close: number;
  pctChg: number;
  vol: number;
  amount: number;
  pe: number | null;
  pb: number | null;
  totalMv: number | null;
  tradeDate: string;
};

export type WatchlistStock = {
  id: number;
  tsCode: string;
  notes: string | null;
  tags: string[];
  targetPrice: number | null;
  sortOrder: number;
  addedAt: string;
  updatedAt: string;
  quote: StockQuote | null;
};

export type WatchlistSummary = {
  stockCount: number;
  upCount: number;
  downCount: number;
  flatCount: number;
  avgPctChg: number;
  totalMv: number;
};

export type WatchlistOverviewItem = Watchlist & {
  summary: WatchlistSummary | null;
};

export function getWatchlists() {
  return apiClient.post<Watchlist[]>('/api/watchlist/list');
}
export function createWatchlist(data: {
  name: string;
  description?: string;
  isDefault?: boolean;
}) {
  return apiClient.post<Watchlist>('/api/watchlist/create', data);
}
export function updateWatchlist(data: {
  id: number;
  name?: string;
  description?: string;
  isDefault?: boolean;
  sortOrder?: number;
}) {
  return apiClient.post<Watchlist>('/api/watchlist/update', data);
}
export function deleteWatchlist(id: number) {
  return apiClient.post<{ message: string }>('/api/watchlist/delete', { id });
}
export function reorderWatchlists(items: Array<{ id: number; sortOrder: number }>) {
  return apiClient.post<{ message: string }>('/api/watchlist/reorder', { items });
}
export function getWatchlistStocks(watchlistId: number) {
  return apiClient.post<{ stocks: WatchlistStock[] }>('/api/watchlist/stocks/list', {
    watchlistId,
  });
}
export function addStock(data: {
  watchlistId: number;
  tsCode: string;
  notes?: string;
  tags?: string[];
  targetPrice?: number;
}) {
  return apiClient.post<WatchlistStock>('/api/watchlist/stocks/add', data);
}
export function batchAddStocks(data: {
  watchlistId: number;
  stocks: Array<{ tsCode: string; notes?: string; tags?: string[]; targetPrice?: number }>;
}) {
  return apiClient.post<{ added: number; skipped: number }>(
    '/api/watchlist/stocks/batch-add',
    data
  );
}
export function updateStock(data: {
  watchlistId: number;
  stockId: number;
  notes?: string;
  tags?: string[];
  targetPrice?: number;
}) {
  return apiClient.post<WatchlistStock>('/api/watchlist/stocks/update', data);
}
export function removeStock(watchlistId: number, stockId: number) {
  return apiClient.post<{ message: string }>('/api/watchlist/stocks/remove', {
    watchlistId,
    stockId,
  });
}
export function batchRemoveStocks(watchlistId: number, stockIds: number[]) {
  return apiClient.post<{ message: string }>('/api/watchlist/stocks/batch-remove', {
    watchlistId,
    stockIds,
  });
}
export function getWatchlistSummary(watchlistId: number) {
  return apiClient.post<WatchlistSummary>('/api/watchlist/summary', { watchlistId });
}
export function getWatchlistOverview() {
  return apiClient.post<WatchlistOverviewItem[]>('/api/watchlist/overview');
}
