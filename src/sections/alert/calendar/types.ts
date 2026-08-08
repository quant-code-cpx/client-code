import type {
  EventType,
  ImpactLevel,
  CalendarScope,
  CalendarEvent,
  CalendarListParams,
} from 'src/api/alert';

import dayjs from 'dayjs';

export type ViewMode = 'grid' | 'timeline' | 'table';

export type FilterState = {
  startDate: string;
  endDate: string;
  scope: CalendarScope;
  watchlistId?: number;
  portfolioId?: string;
  types: EventType[];
  impactLevels: ImpactLevel[];
  sectorCodes: string[];
  marketCapBuckets: string[];
  keyword: string;
  sortBy: 'date' | 'impact' | 'tsCode';
  sortOrder: 'asc' | 'desc';
  view: ViewMode;
};

export const DEFAULT_FILTERS: FilterState = {
  startDate: '',
  endDate: '',
  scope: 'ALL',
  types: [],
  impactLevels: [],
  sectorCodes: [],
  marketCapBuckets: [],
  keyword: '',
  sortBy: 'date',
  sortOrder: 'asc',
  view: 'grid',
};

export type FilterPatch = Partial<FilterState>;

export function createCalendarDateRange(
  inclusiveDays: 1 | 7 | 14 | 30,
  baseDate = dayjs()
): { startDate: string; endDate: string } {
  return {
    startDate: baseDate.format('YYYYMMDD'),
    endDate: baseDate.add(inclusiveDays - 1, 'day').format('YYYYMMDD'),
  };
}

export function mapMarketCapBuckets(buckets: string[]): string[] | undefined {
  if (buckets.length === 0) return undefined;
  const bucket = buckets[0];
  if (bucket === 'SMALL') return ['SMALL', 'MID'];
  if (bucket === 'MID') return ['LARGE'];
  if (bucket === 'LARGE') return ['MEGA'];
  return buckets;
}

export function filtersToQueryParams(f: FilterState): CalendarListParams {
  return {
    startDate: f.startDate,
    endDate: f.endDate,
    scope: f.scope,
    watchlistId: f.scope === 'WATCHLIST' ? f.watchlistId : undefined,
    portfolioId: f.scope === 'PORTFOLIO' ? f.portfolioId : undefined,
    types: f.types.length > 0 ? f.types : undefined,
    impactLevels: f.impactLevels.length > 0 ? f.impactLevels : undefined,
    sectorCodes: f.sectorCodes.length > 0 ? f.sectorCodes : undefined,
    marketCapBuckets: mapMarketCapBuckets(f.marketCapBuckets),
    keyword: f.keyword.trim() || undefined,
    sortBy: f.sortBy,
    sortOrder: f.sortOrder,
  };
}

export function getEventImpactLevel(event: CalendarEvent): ImpactLevel {
  if (event.impactLevel) return event.impactLevel;
  const score = event.impactScore ?? 0;
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}
