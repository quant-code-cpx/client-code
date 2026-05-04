import type { EventType, ImpactLevel, CalendarScope } from 'src/api/alert';

import dayjs from 'dayjs';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DEFAULT_FILTERS } from './types';

import type { ViewMode, FilterPatch, FilterState } from './types';

const KEY = {
  start: 'start',
  end: 'end',
  scope: 'scope',
  watchlist: 'wl',
  portfolio: 'pf',
  types: 'types',
  impact: 'impact',
  sectors: 'sectors',
  caps: 'caps',
  keyword: 'q',
  sortBy: 'sortBy',
  sortOrder: 'sortOrder',
  view: 'view',
} as const;

const VALID_VIEWS: ViewMode[] = ['grid', 'timeline', 'table'];
const VALID_SCOPES: CalendarScope[] = ['ALL', 'WATCHLIST', 'PORTFOLIO'];
const VALID_IMPACTS: ImpactLevel[] = ['HIGH', 'MEDIUM', 'LOW'];
const VALID_TYPES: EventType[] = [
  'DISCLOSURE',
  'FLOAT',
  'DIVIDEND',
  'FORECAST',
  'IPO',
  'CONVERTIBLE',
  'SHAREHOLDER',
];

function parseList<T extends string>(raw: string | null, valid: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(',').filter((v): v is T => (valid as readonly string[]).includes(v));
}

function parseEnum<T extends string>(raw: string | null, valid: readonly T[], fallback: T): T {
  if (raw && (valid as readonly string[]).includes(raw)) return raw as T;
  return fallback;
}

function defaultDateRange(): { startDate: string; endDate: string } {
  const today = dayjs();
  return {
    startDate: today.format('YYYYMMDD'),
    endDate: today.add(14, 'day').format('YYYYMMDD'),
  };
}

export function useCalendarState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: FilterState = useMemo(() => {
    const fallback = defaultDateRange();
    return {
      startDate: searchParams.get(KEY.start) || fallback.startDate,
      endDate: searchParams.get(KEY.end) || fallback.endDate,
      scope: parseEnum(searchParams.get(KEY.scope), VALID_SCOPES, DEFAULT_FILTERS.scope),
      watchlistId: searchParams.get(KEY.watchlist)
        ? Number(searchParams.get(KEY.watchlist))
        : undefined,
      portfolioId: searchParams.get(KEY.portfolio)
        ? Number(searchParams.get(KEY.portfolio))
        : undefined,
      types: parseList(searchParams.get(KEY.types), VALID_TYPES),
      impactLevels: parseList(searchParams.get(KEY.impact), VALID_IMPACTS),
      sectorCodes: searchParams.get(KEY.sectors)
        ? searchParams.get(KEY.sectors)!.split(',').filter(Boolean)
        : [],
      marketCapBuckets: searchParams.get(KEY.caps)
        ? searchParams.get(KEY.caps)!.split(',').filter(Boolean)
        : [],
      keyword: searchParams.get(KEY.keyword) || '',
      sortBy: parseEnum(
        searchParams.get(KEY.sortBy),
        ['date', 'impact', 'tsCode'] as const,
        DEFAULT_FILTERS.sortBy
      ),
      sortOrder: parseEnum(
        searchParams.get(KEY.sortOrder),
        ['asc', 'desc'] as const,
        DEFAULT_FILTERS.sortOrder
      ),
      view: parseEnum(searchParams.get(KEY.view), VALID_VIEWS, DEFAULT_FILTERS.view),
    };
  }, [searchParams]);

  const update = useCallback(
    (patch: FilterPatch) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const apply = (k: string, v: unknown) => {
            if (v === undefined || v === null || v === '') {
              next.delete(k);
              return;
            }
            if (Array.isArray(v)) {
              if (v.length === 0) next.delete(k);
              else next.set(k, v.join(','));
              return;
            }
            next.set(k, String(v));
          };
          if ('startDate' in patch) apply(KEY.start, patch.startDate);
          if ('endDate' in patch) apply(KEY.end, patch.endDate);
          if ('scope' in patch) apply(KEY.scope, patch.scope);
          if ('watchlistId' in patch) apply(KEY.watchlist, patch.watchlistId);
          if ('portfolioId' in patch) apply(KEY.portfolio, patch.portfolioId);
          if ('types' in patch) apply(KEY.types, patch.types);
          if ('impactLevels' in patch) apply(KEY.impact, patch.impactLevels);
          if ('sectorCodes' in patch) apply(KEY.sectors, patch.sectorCodes);
          if ('marketCapBuckets' in patch) apply(KEY.caps, patch.marketCapBuckets);
          if ('keyword' in patch) apply(KEY.keyword, patch.keyword);
          if ('sortBy' in patch) apply(KEY.sortBy, patch.sortBy);
          if ('sortOrder' in patch) apply(KEY.sortOrder, patch.sortOrder);
          if ('view' in patch) apply(KEY.view, patch.view);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return { filters, update, reset };
}
