import type { EventType, ImpactLevel, CalendarScope } from 'src/api/alert';

import { useSearchParams } from 'react-router';
import { useMemo, useEffect, useCallback } from 'react';

import { DEFAULT_FILTERS, createCalendarDateRange } from './types';

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
const VALID_MARKET_CAP_BUCKETS = ['LARGE', 'MID', 'SMALL'] as const;

function parseCalendarDate(raw: string | null): string | undefined {
  if (!raw || !/^\d{8}$/.test(raw)) return undefined;

  const year = Number(raw.slice(0, 4));
  const month = Number(raw.slice(4, 6));
  const day = Number(raw.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }

  return raw;
}

function parsePositiveInteger(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function parseMarketCapBuckets(raw: string | null): string[] {
  if (!raw) return [];
  const valid = raw
    .split(',')
    .filter((value): value is (typeof VALID_MARKET_CAP_BUCKETS)[number] =>
      VALID_MARKET_CAP_BUCKETS.includes(value as (typeof VALID_MARKET_CAP_BUCKETS)[number])
    );

  // 市值筛选在 UI 中是单选；深链出现多个值时保留第一个合法值。
  return valid.slice(0, 1);
}

function parseList<T extends string>(raw: string | null, valid: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(',').filter((v): v is T => (valid as readonly string[]).includes(v));
}

function parseEnum<T extends string>(raw: string | null, valid: readonly T[], fallback: T): T {
  if (raw && (valid as readonly string[]).includes(raw)) return raw as T;
  return fallback;
}

/**
 * Keep deep links safe for the API and canonical for share/reload. Unknown
 * parameters are deliberately retained because the route can be embedded by
 * other dashboard state.
 */
function normalizeCalendarSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  const normalizeEnum = <T extends string>(key: string, valid: readonly T[]) => {
    const raw = searchParams.get(key);
    if (raw && !(valid as readonly string[]).includes(raw)) next.delete(key);
  };
  const normalizeList = <T extends string>(key: string, valid: readonly T[]) => {
    const raw = searchParams.get(key);
    if (!raw) return;
    const values = parseList(raw, valid);
    if (values.length === 0) next.delete(key);
    else next.set(key, values.join(','));
  };

  const rawStart = searchParams.get(KEY.start);
  const rawEnd = searchParams.get(KEY.end);
  const startDate = parseCalendarDate(rawStart);
  const endDate = parseCalendarDate(rawEnd);
  if ((rawStart && !startDate) || (rawEnd && !endDate) || (startDate && endDate && startDate > endDate)) {
    next.delete(KEY.start);
    next.delete(KEY.end);
  }

  if (searchParams.get(KEY.watchlist) && !parsePositiveInteger(searchParams.get(KEY.watchlist))) {
    next.delete(KEY.watchlist);
  }
  normalizeEnum(KEY.scope, VALID_SCOPES);
  normalizeEnum(KEY.sortBy, ['date', 'impact', 'tsCode'] as const);
  normalizeEnum(KEY.sortOrder, ['asc', 'desc'] as const);
  normalizeEnum(KEY.view, VALID_VIEWS);
  normalizeList(KEY.types, VALID_TYPES);
  normalizeList(KEY.impact, VALID_IMPACTS);

  const rawCaps = searchParams.get(KEY.caps);
  if (rawCaps) {
    const caps = parseMarketCapBuckets(rawCaps);
    if (caps.length === 0) next.delete(KEY.caps);
    else next.set(KEY.caps, caps.join(','));
  }

  const rawSectors = searchParams.get(KEY.sectors);
  if (rawSectors) {
    const sectors = rawSectors.split(',').filter(Boolean);
    if (sectors.length === 0) next.delete(KEY.sectors);
    else next.set(KEY.sectors, sectors.join(','));
  }

  return next;
}

export function useCalendarState() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const normalized = normalizeCalendarSearchParams(searchParams);
    if (normalized.toString() !== searchParams.toString()) {
      setSearchParams(normalized, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filters: FilterState = useMemo(() => {
    const fallback = createCalendarDateRange(14);
    const startDate = parseCalendarDate(searchParams.get(KEY.start)) ?? fallback.startDate;
    const endDate = parseCalendarDate(searchParams.get(KEY.end)) ?? fallback.endDate;
    const hasValidRange = startDate <= endDate;

    return {
      startDate: hasValidRange ? startDate : fallback.startDate,
      endDate: hasValidRange ? endDate : fallback.endDate,
      scope: parseEnum(searchParams.get(KEY.scope), VALID_SCOPES, DEFAULT_FILTERS.scope),
      watchlistId: parsePositiveInteger(searchParams.get(KEY.watchlist)),
      portfolioId: searchParams.get(KEY.portfolio) || undefined,
      types: parseList(searchParams.get(KEY.types), VALID_TYPES),
      impactLevels: parseList(searchParams.get(KEY.impact), VALID_IMPACTS),
      sectorCodes: searchParams.get(KEY.sectors)
        ? searchParams.get(KEY.sectors)!.split(',').filter(Boolean)
        : [],
      marketCapBuckets: parseMarketCapBuckets(searchParams.get(KEY.caps)),
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
