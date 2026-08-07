import type {
  NewsCoverageWarning,
  NewsArticleListItem,
  NewsArticleListRequest,
  NewsArticleListResponse,
} from 'src/api/news';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { newsApi } from 'src/api/news';

export type NewsFeedStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export type UseNewsFeedResult = {
  items: NewsArticleListItem[];
  status: NewsFeedStatus;
  error: unknown | null;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: unknown | null;
  refreshing: boolean;
  refreshError: unknown | null;
  hasNewItems: boolean;
  partial: boolean;
  warnings: NewsCoverageWarning[];
  dataThrough: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
};

type FeedState = Omit<UseNewsFeedResult, 'hasMore' | 'loadMore' | 'refresh'> & {
  nextCursor: string | null;
};

const INITIAL_STATE: FeedState = {
  items: [],
  status: 'loading',
  error: null,
  nextCursor: null,
  loadingMore: false,
  loadMoreError: null,
  refreshing: false,
  refreshError: null,
  hasNewItems: false,
  partial: false,
  warnings: [],
  dataThrough: null,
};

const CURSOR_ERROR_CODES = new Set([7002, 7003, 7004]);
export const NEWS_PROBE_INTERVAL_MS = 60_000;

class NewsCursorContractError extends Error {
  constructor() {
    super('服务端返回重复新闻游标，已停止加载更多');
    this.name = 'NewsCursorContractError';
  }
}

export function useNewsFeed(request: NewsArticleListRequest): UseNewsFeedResult {
  const requestKey = useMemo(() => stableJson(request), [request]);
  const requestRef = useRef(request);
  const generationRef = useRef(0);
  const itemsRef = useRef<NewsArticleListItem[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const seenCursorsRef = useRef<Set<string>>(new Set());
  const firstControllerRef = useRef<AbortController | null>(null);
  const moreControllerRef = useRef<AbortController | null>(null);
  const probeControllerRef = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);
  const refreshingRef = useRef(false);
  const [state, setState] = useState<FeedState>(INITIAL_STATE);

  requestRef.current = request;

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    firstControllerRef.current?.abort();
    moreControllerRef.current?.abort();
    probeControllerRef.current?.abort();
    loadingMoreRef.current = false;
    refreshingRef.current = false;
    itemsRef.current = [];
    nextCursorRef.current = null;
    seenCursorsRef.current.clear();

    const controller = new AbortController();
    firstControllerRef.current = controller;
    setState(INITIAL_STATE);

    void newsApi
      .listArticles(requestRef.current, controller.signal)
      .then((response) => {
        if (!isCurrent(generationRef, generation, controller)) return;
        commitFirstPage(response, itemsRef, nextCursorRef, setState);
      })
      .catch((error: unknown) => {
        if (!isCurrent(generationRef, generation, controller) || isAbortError(error)) return;
        setState({ ...INITIAL_STATE, status: 'error', error });
      });

    return () => {
      controller.abort();
      moreControllerRef.current?.abort();
      probeControllerRef.current?.abort();
    };
  }, [requestKey]);

  const refresh = useCallback(async (): Promise<void> => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    firstControllerRef.current?.abort();
    moreControllerRef.current?.abort();
    probeControllerRef.current?.abort();
    loadingMoreRef.current = false;

    const controller = new AbortController();
    firstControllerRef.current = controller;
    setState((current) => ({
      ...current,
      refreshing: true,
      refreshError: null,
      hasNewItems: false,
      loadingMore: false,
    }));

    try {
      const response = await newsApi.listArticles(
        withoutCursor(requestRef.current),
        controller.signal
      );
      if (!isCurrent(generationRef, generation, controller)) return;
      seenCursorsRef.current.clear();
      commitFirstPage(response, itemsRef, nextCursorRef, setState);
    } catch (error) {
      if (!isCurrent(generationRef, generation, controller) || isAbortError(error)) return;
      if (itemsRef.current.length > 0) {
        setState((current) => ({
          ...current,
          status: 'ready',
          refreshing: false,
          refreshError: error,
        }));
      } else {
        setState({ ...INITIAL_STATE, status: 'error', error, refreshError: error });
      }
    } finally {
      if (generationRef.current === generation) {
        refreshingRef.current = false;
        setState((current) => (current.refreshing ? { ...current, refreshing: false } : current));
      }
      if (firstControllerRef.current === controller) firstControllerRef.current = null;
    }
  }, []);

  const probe = useCallback(async (): Promise<void> => {
    if (
      itemsRef.current.length === 0 ||
      document.visibilityState !== 'visible' ||
      navigator.onLine === false ||
      probeControllerRef.current
    ) {
      return;
    }
    const generation = generationRef.current;
    const controller = new AbortController();
    probeControllerRef.current = controller;
    try {
      const response = await newsApi.listArticles(
        withoutCursor(requestRef.current),
        controller.signal
      );
      if (!isCurrent(generationRef, generation, controller)) return;
      const currentFirst = itemsRef.current[0];
      const probedFirst = response.items[0];
      const changed = Boolean(
        probedFirst &&
          (!currentFirst ||
            probedFirst.articleId !== currentFirst.articleId ||
            probedFirst.revision > currentFirst.revision)
      );
      if (changed) setState((current) => ({ ...current, hasNewItems: true }));
    } catch (error) {
      if (!isAbortError(error)) {
        // Probe 是静默提示链，不覆盖已加载列表或手动刷新错误。
      }
    } finally {
      if (probeControllerRef.current === controller) probeControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const schedule = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (document.visibilityState === 'visible' && navigator.onLine !== false) {
        timer = setInterval(() => void probe(), NEWS_PROBE_INTERVAL_MS);
      }
    };
    schedule();
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('online', schedule);
    window.addEventListener('offline', schedule);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('online', schedule);
      window.removeEventListener('offline', schedule);
      probeControllerRef.current?.abort();
      probeControllerRef.current = null;
    };
  }, [probe, requestKey]);

  const loadMore = useCallback(async (): Promise<void> => {
    const cursor = nextCursorRef.current;
    if (!cursor || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    seenCursorsRef.current.add(cursor);
    const generation = generationRef.current;
    const controller = new AbortController();
    moreControllerRef.current = controller;
    setState((current) => ({ ...current, loadingMore: true, loadMoreError: null }));

    try {
      const response = await newsApi.listArticles(
        { ...requestRef.current, cursor },
        controller.signal
      );
      if (!isCurrent(generationRef, generation, controller)) return;
      const items = mergeNewsItems(itemsRef.current, response.items);
      const responseCursor = response.nextCursor ?? null;
      const repeatedCursor = responseCursor !== null && seenCursorsRef.current.has(responseCursor);
      itemsRef.current = items;
      nextCursorRef.current = repeatedCursor ? null : responseCursor;
      setState((current) => ({
        ...current,
        items,
        status: items.length ? 'ready' : 'empty',
        nextCursor: nextCursorRef.current,
        loadingMore: false,
        loadMoreError: repeatedCursor ? new NewsCursorContractError() : null,
      }));
    } catch (error) {
      if (!isCurrent(generationRef, generation, controller) || isAbortError(error)) return;
      if (isCursorError(error)) {
        nextCursorRef.current = null;
        seenCursorsRef.current.clear();
        await recoverFirstPage(
          generationRef,
          generation,
          controller,
          requestRef.current,
          itemsRef,
          nextCursorRef,
          setState
        );
      } else {
        setState((current) => ({ ...current, loadingMore: false, loadMoreError: error }));
      }
    } finally {
      if (generationRef.current === generation) {
        loadingMoreRef.current = false;
        setState((current) => (current.loadingMore ? { ...current, loadingMore: false } : current));
      }
      if (moreControllerRef.current === controller) moreControllerRef.current = null;
    }
  }, []);

  return {
    items: state.items,
    status: state.status,
    error: state.error,
    hasMore: state.nextCursor !== null,
    loadingMore: state.loadingMore,
    loadMoreError: state.loadMoreError,
    refreshing: state.refreshing,
    refreshError: state.refreshError,
    hasNewItems: state.hasNewItems,
    partial: state.partial,
    warnings: state.warnings,
    dataThrough: state.dataThrough,
    loadMore,
    refresh,
  };
}

async function recoverFirstPage(
  generationRef: { current: number },
  generation: number,
  controller: AbortController,
  request: NewsArticleListRequest,
  itemsRef: { current: NewsArticleListItem[] },
  nextCursorRef: { current: string | null },
  setState: React.Dispatch<React.SetStateAction<FeedState>>
): Promise<void> {
  try {
    const response = await newsApi.listArticles(withoutCursor(request), controller.signal);
    if (!isCurrent(generationRef, generation, controller)) return;
    commitFirstPage(response, itemsRef, nextCursorRef, setState);
  } catch (error) {
    if (isAbortError(error) || !isCurrent(generationRef, generation, controller)) return;
    nextCursorRef.current = null;
    setState((current) => ({
      ...current,
      nextCursor: null,
      loadingMore: false,
      loadMoreError: error,
    }));
  }
}

function commitFirstPage(
  response: NewsArticleListResponse,
  itemsRef: { current: NewsArticleListItem[] },
  nextCursorRef: { current: string | null },
  setState: React.Dispatch<React.SetStateAction<FeedState>>
): void {
  const items = mergeNewsItems([], response.items);
  itemsRef.current = items;
  nextCursorRef.current = response.nextCursor ?? null;
  setState({
    items,
    status: items.length ? 'ready' : 'empty',
    error: null,
    nextCursor: nextCursorRef.current,
    loadingMore: false,
    loadMoreError: null,
    refreshing: false,
    refreshError: null,
    hasNewItems: false,
    partial: response.partial,
    warnings: response.warnings,
    dataThrough: response.dataThrough ?? null,
  });
}

function mergeNewsItems(
  currentItems: readonly NewsArticleListItem[],
  incomingItems: readonly NewsArticleListItem[]
): NewsArticleListItem[] {
  const merged: NewsArticleListItem[] = [];
  const positions = new Map<string, number>();

  for (const item of [...currentItems, ...incomingItems]) {
    const position = positions.get(item.articleId);
    if (position === undefined) {
      positions.set(item.articleId, merged.length);
      merged.push(item);
    } else if (item.revision > merged[position].revision) {
      merged[position] = item;
    }
  }
  return merged;
}

function isCursorError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'number' &&
      CURSOR_ERROR_CODES.has(error.code)
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : Boolean(error && typeof error === 'object' && 'name' in error && error.name === 'AbortError');
}

function isCurrent(
  generationRef: { current: number },
  generation: number,
  controller: AbortController
): boolean {
  return generationRef.current === generation && !controller.signal.aborted;
}

function withoutCursor(request: NewsArticleListRequest): NewsArticleListRequest {
  const body = { ...request };
  delete body.cursor;
  return body;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableJson(nested)}`)
    .join(',')}}`;
}
