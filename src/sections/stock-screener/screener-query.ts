import type { StrategyItem, ScreenerQuery, ScreenerFilters } from 'src/api/screener';

import { DEFAULT_FILTERS } from './constants';

// ----------------------------------------------------------------------

export type ExecutedScreenerQuery = {
  filters: ScreenerFilters;
  page: number;
  rowsPerPage: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
};

export const DEFAULT_EXECUTED_QUERY: ExecutedScreenerQuery = {
  filters: DEFAULT_FILTERS,
  page: 0,
  rowsPerPage: 20,
  sortBy: 'totalMv',
  sortOrder: 'desc',
};

export const HISTORICAL_COMPATIBILITY_KEYS: (keyof ScreenerFilters)[] = [
  'industry',
  'area',
  'isHs',
  'minCircMv',
  'maxCircMv',
  'minAmount',
  'maxAmount',
  'maxGrossMargin',
  'maxNetMargin',
];

export function buildScreenerRequest(query: ExecutedScreenerQuery): ScreenerQuery {
  return {
    ...query.filters,
    page: query.page + 1,
    pageSize: query.rowsPerPage,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
}

export function resolveStrategySelection(item: StrategyItem): {
  filters: ScreenerFilters;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
} {
  const rawFilters = item.filters as Partial<ScreenerFilters> & {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  const {
    sortBy: nestedSortBy,
    sortOrder: nestedSortOrder,
    ...filters
  } = rawFilters;
  const sortBy = item.sortBy ?? nestedSortBy ?? 'totalMv';
  const rawSortOrder = item.sortOrder ?? nestedSortOrder;

  return {
    filters: { ...DEFAULT_FILTERS, ...filters },
    sortBy,
    sortOrder: rawSortOrder === 'asc' ? 'asc' : 'desc',
  };
}

export function preserveHistoricalCompatibilityKeys(
  previous: Partial<ScreenerFilters>,
  current: ScreenerFilters
): ScreenerFilters {
  const merged = { ...current };
  for (const key of HISTORICAL_COMPATIBILITY_KEYS) {
    if (!(key in current) && previous[key] !== undefined) {
      Object.assign(merged, { [key]: previous[key] });
    }
  }
  return merged;
}
