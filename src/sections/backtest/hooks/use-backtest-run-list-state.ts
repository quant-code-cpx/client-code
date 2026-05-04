import type { BacktestRunListQuery, BacktestRunSortField } from 'src/api/backtest';

import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// ----------------------------------------------------------------------

export type RunArchiveFilter = 'active' | 'archived' | 'all';

export type RunListFilter = {
  status: string;
  strategyType: string;
  keyword: string;
  startDate: string;
  endDate: string;
  archived: RunArchiveFilter;
  tagIds: string[];
};

export type RunListSort = {
  field: BacktestRunSortField;
  order: 'asc' | 'desc';
} | null;

export type BacktestRunListState = {
  filter: RunListFilter;
  page: number;
  pageSize: number;
  sort: RunListSort;
  highlightRunId: string;
};

export const DEFAULT_RUN_LIST_PAGE_SIZE = 20;

const SORT_FIELDS = new Set<BacktestRunSortField>([
  'createdAt',
  'totalReturn',
  'annualizedReturn',
  'maxDrawdown',
  'sharpeRatio',
  'durationSeconds',
]);

function safePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseArchiveFilter(value: string | null): RunArchiveFilter {
  if (value === 'archived' || value === 'all') return value;
  return 'active';
}

function parseSort(params: URLSearchParams): RunListSort {
  const field = params.get('sort') as BacktestRunSortField | null;
  if (!field || !SORT_FIELDS.has(field)) return null;
  return { field, order: params.get('order') === 'asc' ? 'asc' : 'desc' };
}

export function parseRunListState(params: URLSearchParams): BacktestRunListState {
  return {
    filter: {
      status: params.get('status') ?? '',
      strategyType: params.get('strategyType') ?? '',
      keyword: params.get('keyword') ?? '',
      startDate: params.get('start') ?? '',
      endDate: params.get('end') ?? '',
      archived: parseArchiveFilter(params.get('archived')),
      tagIds: params.get('tagIds')?.split(',').filter(Boolean) ?? [],
    },
    page: safePositiveInt(params.get('page'), 1) - 1,
    pageSize: safePositiveInt(params.get('pageSize'), DEFAULT_RUN_LIST_PAGE_SIZE),
    sort: parseSort(params),
    highlightRunId: params.get('highlight') ?? '',
  };
}

export function serializeRunListState(state: BacktestRunListState): URLSearchParams {
  const params = new URLSearchParams();
  const { filter, sort } = state;

  if (filter.status) params.set('status', filter.status);
  if (filter.strategyType) params.set('strategyType', filter.strategyType);
  if (filter.keyword.trim()) params.set('keyword', filter.keyword.trim());
  if (filter.startDate) params.set('start', filter.startDate);
  if (filter.endDate) params.set('end', filter.endDate);
  if (filter.archived !== 'active') params.set('archived', filter.archived);
  if (filter.tagIds.length > 0) params.set('tagIds', filter.tagIds.join(','));
  if (state.page > 0) params.set('page', String(state.page + 1));
  if (state.pageSize !== DEFAULT_RUN_LIST_PAGE_SIZE) params.set('pageSize', String(state.pageSize));
  if (sort) {
    params.set('sort', sort.field);
    params.set('order', sort.order);
  }
  if (state.highlightRunId) params.set('highlight', state.highlightRunId);

  return params;
}

export function toRunListQuery(state: BacktestRunListState): BacktestRunListQuery {
  const { filter, sort } = state;
  return {
    page: state.page + 1,
    pageSize: state.pageSize,
    status: filter.status || undefined,
    strategyType: filter.strategyType || undefined,
    keyword: filter.keyword.trim() || undefined,
    createdStart: filter.startDate || undefined,
    createdEnd: filter.endDate || undefined,
    archived: filter.archived === 'all' ? undefined : filter.archived === 'archived',
    tagIds: filter.tagIds.length > 0 ? filter.tagIds : undefined,
    sort: sort?.field,
    order: sort?.order,
  };
}

export function countActiveRunFilters(filter: RunListFilter) {
  return [
    filter.status,
    filter.strategyType,
    filter.keyword.trim(),
    filter.startDate || filter.endDate,
    filter.archived !== 'active' ? filter.archived : '',
    filter.tagIds.length > 0 ? 'tags' : '',
  ].filter(Boolean).length;
}

export function isInvalidDateRange(filter: RunListFilter) {
  return Boolean(filter.startDate && filter.endDate && filter.startDate > filter.endDate);
}

export function useBacktestRunListState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useMemo(() => parseRunListState(searchParams), [searchParams]);

  const commit = useCallback(
    (nextState: BacktestRunListState) => {
      setSearchParams(serializeRunListState(nextState), { replace: true });
    },
    [setSearchParams]
  );

  const setFilter = useCallback(
    (patch: Partial<RunListFilter>) => {
      commit({ ...state, page: 0, filter: { ...state.filter, ...patch } });
    },
    [commit, state]
  );

  const setPage = useCallback(
    (page: number) => {
      commit({ ...state, page });
    },
    [commit, state]
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      commit({ ...state, page: 0, pageSize });
    },
    [commit, state]
  );

  const setSort = useCallback(
    (field: BacktestRunSortField) => {
      const nextSort =
        state.sort?.field !== field
          ? { field, order: 'desc' as const }
          : state.sort.order === 'desc'
            ? { field, order: 'asc' as const }
            : null;
      commit({ ...state, page: 0, sort: nextSort });
    },
    [commit, state]
  );

  const clearFilters = useCallback(() => {
    commit({
      ...state,
      page: 0,
      filter: {
        status: '',
        strategyType: '',
        keyword: '',
        startDate: '',
        endDate: '',
        archived: 'active',
        tagIds: [],
      },
    });
  }, [commit, state]);

  return {
    state,
    setFilter,
    setPage,
    setPageSize,
    setSort,
    clearFilters,
  };
}
