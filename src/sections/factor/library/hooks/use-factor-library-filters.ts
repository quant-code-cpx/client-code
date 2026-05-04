import type { FactorStatus, FactorSourceType } from 'src/api/factor';

import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// ----------------------------------------------------------------------

export type SortKey = 'ir' | 'ic10d' | 'coverage' | 'lastComputeDate' | 'name';
export type ViewMode = 'card' | 'table';

export type FactorLibraryFilters = {
  view: ViewMode;
  category: string; // FactorCategory | 'ALL'
  search: string;
  sourceTypes: FactorSourceType[];
  statuses: FactorStatus[];
  icMin: number | null;
  coverageMin: number | null;
  sortBy: SortKey;
  sortOrder: 'asc' | 'desc';
  /** 收益周期切换（默认 10d，依赖 BE-11） */
  icPeriod: '5d' | '10d' | '20d';
};

const DEFAULTS: FactorLibraryFilters = {
  view: 'card',
  category: 'ALL',
  search: '',
  sourceTypes: [],
  statuses: [],
  icMin: null,
  coverageMin: null,
  sortBy: 'ir',
  sortOrder: 'desc',
  icPeriod: '10d',
};

const KEY = {
  view: 'view',
  category: 'cat',
  search: 'q',
  sourceTypes: 'src',
  statuses: 'st',
  icMin: 'icMin',
  coverageMin: 'covMin',
  sortBy: 'sb',
  sortOrder: 'so',
  icPeriod: 'p',
} as const;

function parseList<T extends string>(raw: string | null): T[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as T[];
}

function parseNum(raw: string | null): number | null {
  if (raw === null || raw === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) ? v : null;
}

/**
 * 因子库筛选状态 hook：URL 持久化。
 * 与项目其它视图保持一致，使用 react-router 的 useSearchParams。
 */
export function useFactorLibraryFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<FactorLibraryFilters>(
    () => ({
      view: (params.get(KEY.view) as ViewMode) || DEFAULTS.view,
      category: params.get(KEY.category) || DEFAULTS.category,
      search: params.get(KEY.search) || DEFAULTS.search,
      sourceTypes: parseList<FactorSourceType>(params.get(KEY.sourceTypes)),
      statuses: parseList<FactorStatus>(params.get(KEY.statuses)),
      icMin: parseNum(params.get(KEY.icMin)),
      coverageMin: parseNum(params.get(KEY.coverageMin)),
      sortBy: (params.get(KEY.sortBy) as SortKey) || DEFAULTS.sortBy,
      sortOrder: (params.get(KEY.sortOrder) as 'asc' | 'desc') || DEFAULTS.sortOrder,
      icPeriod: (params.get(KEY.icPeriod) as FactorLibraryFilters['icPeriod']) || DEFAULTS.icPeriod,
    }),
    [params]
  );

  const setFilters = useCallback(
    (patch: Partial<FactorLibraryFilters>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        const key = KEY[k as keyof typeof KEY];
        if (!key) return;
        if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
          next.delete(key);
          return;
        }
        if (Array.isArray(v)) {
          next.set(key, v.join(','));
        } else {
          next.set(key, String(v));
        }
      });
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const reset = useCallback(() => {
    const next = new URLSearchParams(params);
    Object.values(KEY).forEach((k) => next.delete(k));
    setParams(next, { replace: true });
  }, [params, setParams]);

  return { filters, setFilters, reset };
}
