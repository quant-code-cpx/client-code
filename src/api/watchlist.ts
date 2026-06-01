import { apiClient } from './client';

export type Watchlist = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** 后端可能不返回 _count，前端读取时需做空值保护 */
  _count?: { stocks: number };
};

export type StockQuote = {
  close: number | null;
  pctChg: number | null;
  vol: number | null;
  amount: number | null;
  pe: number | null;
  pb: number | null;
  totalMv: number | null;
  tradeDate: string | null;
};

export type WatchlistStock = {
  id: number;
  tsCode: string;
  stockName?: string | null;
  industry?: string | null;
  area?: string | null;
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

export type WatchlistOverviewResponse = {
  watchlists: WatchlistOverviewItem[];
};

export function getWatchlists() {
  return apiClient.post<Watchlist[]>('/api/watchlist/list');
}
export function createWatchlist(data: { name: string; description?: string; isDefault?: boolean }) {
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
    id: watchlistId,
  });
}
export function addStock(data: {
  watchlistId: number;
  tsCode: string;
  notes?: string;
  tags?: string[];
  targetPrice?: number;
}) {
  const { watchlistId, ...rest } = data;
  return apiClient.post<WatchlistStock>('/api/watchlist/stocks', { id: watchlistId, ...rest });
}
export function batchAddStocks(data: {
  watchlistId: number;
  stocks: Array<{ tsCode: string; notes?: string; tags?: string[]; targetPrice?: number }>;
}) {
  return apiClient.post<{ added: number; skipped: number }>('/api/watchlist/stocks/batch', {
    id: data.watchlistId,
    stocks: data.stocks,
  });
}
export function updateStock(data: {
  watchlistId: number;
  stockId: number;
  notes?: string;
  tags?: string[];
  targetPrice?: number;
}) {
  const { watchlistId, ...rest } = data;
  return apiClient.post<WatchlistStock>('/api/watchlist/stocks/update', {
    id: watchlistId,
    ...rest,
  });
}
export function removeStock(watchlistId: number, stockId: number) {
  return apiClient.post<{ message: string }>('/api/watchlist/stocks/delete', {
    id: watchlistId,
    stockId,
  });
}
export function batchRemoveStocks(watchlistId: number, stockIds: number[]) {
  return apiClient.post<{ message: string }>('/api/watchlist/stocks/batch/delete', {
    id: watchlistId,
    stockIds,
  });
}
export function reorderStocks(
  watchlistId: number,
  items: Array<{ id: number; sortOrder: number }>
) {
  return apiClient.post<{ message: string }>('/api/watchlist/stocks/reorder', {
    id: watchlistId,
    items,
  });
}
export function getWatchlistSummary(watchlistId: number) {
  return apiClient.post<WatchlistSummary>('/api/watchlist/summary', { id: watchlistId });
}
export function getWatchlistOverview() {
  // 后端推荐响应：{ watchlists: WatchlistOverviewItem[] }
  // 兼容旧版直接返回数组的实现
  return apiClient.post<WatchlistOverviewResponse | WatchlistOverviewItem[]>(
    '/api/watchlist/overview'
  );
}
