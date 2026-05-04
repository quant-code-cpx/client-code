import type {
  AnomalyType,
  AnomalyScope,
  AnomalySortBy,
  AnomalyListQuery,
  AnomalyListResponse,
} from 'src/api/alert';

import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { alertApi } from 'src/api/alert';
import { getSocket } from 'src/lib/socket';

import { tradeDateToYYYYMMDD } from './anomaly-type-config';

// ----------------------------------------------------------------------

export const ANOMALY_PAGE_SIZE_OPTIONS = [20, 50, 100];

export type AnomalyFilterState = {
  /** 展示用 YYYY-MM-DD；空串表示"最新交易日" */
  tradeDate: string;
  types: AnomalyType[];
  keyword: string;
  scope: AnomalyScope;
  isNewOnly: boolean;
  multiTypeOnly: boolean;
  sortBy: AnomalySortBy;
  sortOrder: 'asc' | 'desc';
  /** 0-indexed UI 页码（API 调用时 +1） */
  pageIndex: number;
  pageSize: number;
};

const DEFAULT_FILTER: AnomalyFilterState = {
  tradeDate: '',
  types: [],
  keyword: '',
  scope: 'ALL',
  isNewOnly: false,
  multiTypeOnly: false,
  sortBy: 'strength',
  sortOrder: 'desc',
  pageIndex: 0,
  pageSize: 20,
};

const ALL_TYPES: AnomalyType[] = ['VOLUME_SURGE', 'CONSECUTIVE_LIMIT_UP', 'LARGE_NET_INFLOW'];
const SORT_BY_VALUES: AnomalySortBy[] = ['strength', 'value', 'scannedAt', 'tsCode', 'anomalyType'];

function parseFromQuery(sp: URLSearchParams): AnomalyFilterState {
  const trade = sp.get('tradeDate') ?? '';
  const tradeDate =
    trade && /^\d{4}-\d{2}-\d{2}$/.test(trade) && dayjs(trade, 'YYYY-MM-DD').isValid() ? trade : '';

  const typesParam = sp.get('types') ?? '';
  const types = typesParam
    .split(',')
    .filter((t): t is AnomalyType => (ALL_TYPES as string[]).includes(t));

  const scopeParam = (sp.get('scope') ?? 'ALL') as AnomalyScope;
  const scope: AnomalyScope = ['ALL', 'WATCHLIST', 'PORTFOLIO'].includes(scopeParam)
    ? scopeParam
    : 'ALL';

  const sortByParam = (sp.get('sortBy') ?? 'strength') as AnomalySortBy;
  const sortBy: AnomalySortBy = SORT_BY_VALUES.includes(sortByParam) ? sortByParam : 'strength';

  const sortOrderParam = sp.get('sortOrder');
  const sortOrder: 'asc' | 'desc' = sortOrderParam === 'asc' ? 'asc' : 'desc';

  const pageIndex = Math.max(0, Math.trunc(Number(sp.get('page') ?? 0)));
  const pageSizeRaw = Math.trunc(Number(sp.get('pageSize') ?? 20));
  const pageSize = ANOMALY_PAGE_SIZE_OPTIONS.includes(pageSizeRaw) ? pageSizeRaw : 20;

  return {
    tradeDate,
    types,
    keyword: sp.get('keyword') ?? '',
    scope,
    isNewOnly: sp.get('isNewOnly') === '1',
    multiTypeOnly: sp.get('multiTypeOnly') === '1',
    sortBy,
    sortOrder,
    pageIndex,
    pageSize,
  };
}

function serializeToQuery(state: AnomalyFilterState): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.tradeDate) sp.set('tradeDate', state.tradeDate);
  if (state.types.length > 0) sp.set('types', state.types.join(','));
  if (state.keyword) sp.set('keyword', state.keyword);
  if (state.scope !== 'ALL') sp.set('scope', state.scope);
  if (state.isNewOnly) sp.set('isNewOnly', '1');
  if (state.multiTypeOnly) sp.set('multiTypeOnly', '1');
  if (state.sortBy !== 'strength') sp.set('sortBy', state.sortBy);
  if (state.sortOrder !== 'desc') sp.set('sortOrder', state.sortOrder);
  if (state.pageIndex !== 0) sp.set('page', String(state.pageIndex));
  if (state.pageSize !== 20) sp.set('pageSize', String(state.pageSize));
  return sp;
}

function buildApiQuery(state: AnomalyFilterState): AnomalyListQuery {
  const tradeDate = tradeDateToYYYYMMDD(state.tradeDate);
  const query: AnomalyListQuery = {
    tradeDate,
    page: state.pageIndex + 1,
    pageSize: state.pageSize,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  };
  if (state.types.length === 1) {
    query.type = state.types[0];
    query.types = state.types;
  } else if (state.types.length > 1) {
    query.types = state.types;
  }
  if (state.keyword.trim()) query.keyword = state.keyword.trim();
  if (state.scope !== 'ALL') query.scope = state.scope;
  if (state.isNewOnly) query.isNewOnly = true;
  if (state.multiTypeOnly) query.multiTypeOnly = true;
  return query;
}

// ----------------------------------------------------------------------

export type ScanFeedback = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info';
};

export type UseAnomalyMonitorState = {
  filter: AnomalyFilterState;
  data: AnomalyListResponse | null;
  loading: boolean;
  error: string;
  refetch: () => void;
  setFilter: (patch: Partial<AnomalyFilterState>) => void;
  resetFilter: () => void;
  scanFeedback: ScanFeedback;
  dismissScanFeedback: () => void;
};

export function useAnomalyMonitorState(): UseAnomalyMonitorState {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilterState] = useState<AnomalyFilterState>(() => parseFromQuery(searchParams));
  const [data, setData] = useState<AnomalyListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>({
    open: false,
    message: '',
    severity: 'info',
  });
  const [reloadKey, setReloadKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // 同步 URL → state（用户使用浏览器前后退）
  useEffect(() => {
    const next = parseFromQuery(searchParams);
    setFilterState((prev) => (sameFilter(prev, next) ? prev : next));
  }, [searchParams]);

  // 拉取数据
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');

    const apiQuery = buildApiQuery(filter);
    alertApi
      .getAnomalies(apiQuery, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : '加载异动数据失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [filter, reloadKey]);

  // WebSocket — 扫描完成提示 + 自动刷新
  useEffect(() => {
    const socket = getSocket();
    const handler = (payload: {
      tradeDate?: string;
      totalNew?: number;
      errorSummary?: string | null;
    }) => {
      if (payload?.errorSummary) {
        setScanFeedback({
          open: true,
          severity: 'error',
          message: `异动扫描失败：${payload.errorSummary}`,
        });
      } else {
        setScanFeedback({
          open: true,
          severity: 'success',
          message: `扫描完成（${payload?.tradeDate ?? '最新交易日'}），新增 ${
            payload?.totalNew ?? 0
          } 条异动`,
        });
      }
      setReloadKey((k) => k + 1);
    };
    socket.on('market-anomaly-scan-completed', handler);
    return () => {
      socket.off('market-anomaly-scan-completed', handler);
    };
  }, []);

  const writeQuery = useCallback(
    (next: AnomalyFilterState) => {
      const nextSp = serializeToQuery(next);
      setSearchParams(nextSp, { replace: true });
    },
    [setSearchParams]
  );

  const setFilter = useCallback(
    (patch: Partial<AnomalyFilterState>) => {
      setFilterState((prev) => {
        const merged: AnomalyFilterState = { ...prev, ...patch };
        // 任何筛选维度改变（除翻页/页大小本身）都重置到第 0 页
        const resetPage =
          patch.tradeDate !== undefined ||
          patch.types !== undefined ||
          patch.keyword !== undefined ||
          patch.scope !== undefined ||
          patch.isNewOnly !== undefined ||
          patch.multiTypeOnly !== undefined ||
          patch.sortBy !== undefined ||
          patch.sortOrder !== undefined ||
          patch.pageSize !== undefined;
        const next = resetPage ? { ...merged, pageIndex: 0 } : merged;
        writeQuery(next);
        return next;
      });
    },
    [writeQuery]
  );

  const resetFilter = useCallback(() => {
    setFilterState((prev) => {
      const next: AnomalyFilterState = { ...DEFAULT_FILTER, tradeDate: prev.tradeDate };
      writeQuery(next);
      return next;
    });
  }, [writeQuery]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  const dismissScanFeedback = useCallback(
    () => setScanFeedback((prev) => ({ ...prev, open: false })),
    []
  );

  return useMemo(
    () => ({
      filter,
      data,
      loading,
      error,
      refetch,
      setFilter,
      resetFilter,
      scanFeedback,
      dismissScanFeedback,
    }),
    [
      filter,
      data,
      loading,
      error,
      refetch,
      setFilter,
      resetFilter,
      scanFeedback,
      dismissScanFeedback,
    ]
  );
}

function sameFilter(a: AnomalyFilterState, b: AnomalyFilterState): boolean {
  return (
    a.tradeDate === b.tradeDate &&
    a.keyword === b.keyword &&
    a.scope === b.scope &&
    a.isNewOnly === b.isNewOnly &&
    a.multiTypeOnly === b.multiTypeOnly &&
    a.sortBy === b.sortBy &&
    a.sortOrder === b.sortOrder &&
    a.pageIndex === b.pageIndex &&
    a.pageSize === b.pageSize &&
    a.types.length === b.types.length &&
    a.types.every((t, i) => t === b.types[i])
  );
}
