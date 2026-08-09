import { apiClient, tokenStorage } from './client';

type DeletionOutcome = 'deleted' | 'retained';

type WatchlistReadOptions<T> = {
  watchlistId?: number;
  deletedFallback?: () => T;
};

// React StrictMode may replay mount effects in development. Share identical in-flight
// read requests so replayed consumers observe one network operation and the same result.
const inFlightReadRequests = new Map<string, Promise<unknown>>();
const deletedWatchlistGenerationBySessionAndId = new Map<string, number>();
const deletionInFlightBySessionAndId = new Map<string, Promise<DeletionOutcome>>();
let readGeneration = 0;

function invalidateWatchlistReads() {
  readGeneration += 1;
  inFlightReadRequests.clear();
}

function deletionKey(sessionEpoch: number, watchlistId: number): string {
  return `${sessionEpoch}:${watchlistId}`;
}

function createReadCancelledError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function assertReadSession(sessionEpoch: number): void {
  if (tokenStorage.getSessionEpoch() !== sessionEpoch) {
    throw createReadCancelledError('认证会话已变更，已取消旧读取');
  }
}

function deletedReadResult<T>(options: WatchlistReadOptions<T>): T {
  if (options.deletedFallback) return options.deletedFallback();
  throw createReadCancelledError('自选组已删除，已取消旧读取');
}

function getDeletionState<T>(
  sessionEpoch: number,
  generation: number,
  options: WatchlistReadOptions<T>
): {
  deleted: boolean;
  pending: Promise<DeletionOutcome> | undefined;
} {
  if (options.watchlistId === undefined) return { deleted: false, pending: undefined };

  const key = deletionKey(sessionEpoch, options.watchlistId);
  return {
    deleted: (deletedWatchlistGenerationBySessionAndId.get(key) ?? -1) > generation,
    pending: deletionInFlightBySessionAndId.get(key),
  };
}

function postReadOnce<T>(
  url: string,
  body?: unknown,
  options: WatchlistReadOptions<T> = {}
): Promise<T> {
  const tokenEpoch = tokenStorage.getEpoch();
  const sessionEpoch = tokenStorage.getSessionEpoch();
  const generation = readGeneration;
  const cacheKey = `${sessionEpoch}:${tokenEpoch}:${generation}:${url}:${JSON.stringify(body ?? null)}`;
  const existing = inFlightReadRequests.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const request = apiClient
    .post<T>(url, body)
    .then(
      async (result) => {
        assertReadSession(sessionEpoch);
        const deletion = getDeletionState(sessionEpoch, generation, options);
        if (deletion.deleted) return deletedReadResult(options);
        if (deletion.pending) {
          const outcome = await deletion.pending;
          assertReadSession(sessionEpoch);
          if (outcome === 'deleted') return deletedReadResult(options);
          return postReadOnce<T>(url, body, options);
        }

        // A non-destructive write began or completed while this read was running.
        // Resolve callers with the current-generation request instead of stale data.
        if (readGeneration !== generation) return postReadOnce<T>(url, body, options);
        return result;
      },
      async (error: unknown) => {
        assertReadSession(sessionEpoch);
        const deletion = getDeletionState(sessionEpoch, generation, options);
        if (deletion.deleted) return deletedReadResult(options);
        if (deletion.pending) {
          const outcome = await deletion.pending;
          assertReadSession(sessionEpoch);
          if (outcome === 'deleted') return deletedReadResult(options);
          return postReadOnce<T>(url, body, options);
        }
        throw error;
      }
    )
    .finally(() => {
      if (inFlightReadRequests.get(cacheKey) === request) {
        inFlightReadRequests.delete(cacheKey);
      }
    });
  inFlightReadRequests.set(cacheKey, request);
  return request;
}

function postMutation<T>(
  url: string,
  body?: unknown,
  onSuccessAfterInvalidation?: (generation: number) => void
): Promise<T> {
  // A mutation may make any overview/list/stocks/summary response stale. Invalidate
  // both before and after it so reads started during the write cannot be reused by
  // the authoritative refresh that follows.
  invalidateWatchlistReads();
  let succeeded = false;
  return apiClient
    .post<T>(url, body)
    .then((result) => {
      succeeded = true;
      return result;
    })
    .finally(() => {
      invalidateWatchlistReads();
      if (succeeded) onSuccessAfterInvalidation?.(readGeneration);
    });
}

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
  return postReadOnce<Watchlist[]>('/api/watchlist/list');
}
export function createWatchlist(data: { name: string; description?: string; isDefault?: boolean }) {
  return postMutation<Watchlist>('/api/watchlist/create', data);
}
export function updateWatchlist(data: {
  id: number;
  name?: string;
  description?: string;
  isDefault?: boolean;
  sortOrder?: number;
}) {
  return postMutation<Watchlist>('/api/watchlist/update', data);
}
export function deleteWatchlist(id: number) {
  const sessionEpoch = tokenStorage.getSessionEpoch();
  const key = deletionKey(sessionEpoch, id);
  const deletion = postMutation<{ message: string }>(
    '/api/watchlist/delete',
    { id },
    (generation) => {
      deletedWatchlistGenerationBySessionAndId.set(key, generation);
    }
  );
  const outcome: Promise<DeletionOutcome> = deletion.then(
    (): DeletionOutcome => 'deleted',
    (): DeletionOutcome => 'retained'
  );
  deletionInFlightBySessionAndId.set(key, outcome);
  void outcome.then(() => {
    if (deletionInFlightBySessionAndId.get(key) === outcome) {
      deletionInFlightBySessionAndId.delete(key);
    }
  });
  return deletion;
}
export function reorderWatchlists(items: Array<{ id: number; sortOrder: number }>) {
  return postMutation<{ message: string }>('/api/watchlist/reorder', { items });
}
export function getWatchlistStocks(watchlistId: number) {
  return postReadOnce<{ stocks: WatchlistStock[] }>(
    '/api/watchlist/stocks/list',
    { id: watchlistId },
    { watchlistId, deletedFallback: () => ({ stocks: [] }) }
  );
}
export function addStock(data: {
  watchlistId: number;
  tsCode: string;
  notes?: string;
  tags?: string[];
  targetPrice?: number;
}) {
  const { watchlistId, ...rest } = data;
  return postMutation<WatchlistStock>('/api/watchlist/stocks', { id: watchlistId, ...rest });
}
export function batchAddStocks(data: {
  watchlistId: number;
  stocks: Array<{ tsCode: string; notes?: string; tags?: string[]; targetPrice?: number }>;
}) {
  return postMutation<{ added: number; skipped: number }>('/api/watchlist/stocks/batch', {
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
  return postMutation<WatchlistStock>('/api/watchlist/stocks/update', {
    id: watchlistId,
    ...rest,
  });
}
export function removeStock(watchlistId: number, stockId: number) {
  return postMutation<{ message: string }>('/api/watchlist/stocks/delete', {
    id: watchlistId,
    stockId,
  });
}
export function batchRemoveStocks(watchlistId: number, stockIds: number[]) {
  return postMutation<{ message: string }>('/api/watchlist/stocks/batch/delete', {
    id: watchlistId,
    stockIds,
  });
}
export function reorderStocks(
  watchlistId: number,
  items: Array<{ id: number; sortOrder: number }>
) {
  return postMutation<{ message: string }>('/api/watchlist/stocks/reorder', {
    id: watchlistId,
    items,
  });
}
export function getWatchlistSummary(watchlistId: number) {
  return postReadOnce<WatchlistSummary>(
    '/api/watchlist/summary',
    { id: watchlistId },
    { watchlistId }
  );
}
export function getWatchlistOverview() {
  // 后端推荐响应：{ watchlists: WatchlistOverviewItem[] }
  // 兼容旧版直接返回数组的实现
  return postReadOnce<WatchlistOverviewResponse | WatchlistOverviewItem[]>(
    '/api/watchlist/overview'
  );
}
