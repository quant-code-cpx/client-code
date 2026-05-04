import type { Dayjs } from 'dayjs';
import type { LimitSealPattern } from 'src/api/alert';

import dayjs from 'dayjs';
import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// ----------------------------------------------------------------------

export type LimitTypeFilter = 'ALL' | 'UP' | 'DOWN';
export type MvBucket = 'UNDER_50' | '50_200' | '200_500' | '500_1000' | 'ABOVE_1000';
export type PctChgLimit = 5 | 10 | 20 | 30;
export type LimitTabKey = 'today' | 'next-day' | 'history';

export type LimitFilterState = {
  tab: LimitTabKey;
  tradeDate: Dayjs | null;
  limitType: LimitTypeFilter;
  industry: string;
  concept: string;
  mvBucket: MvBucket | '';
  pctChgLimit: PctChgLimit | '';
  sealPattern: LimitSealPattern | '';
  minStreak: number | '';
};

const DEFAULT_STATE: LimitFilterState = {
  tab: 'today',
  tradeDate: null,
  limitType: 'ALL',
  industry: '',
  concept: '',
  mvBucket: '',
  pctChgLimit: '',
  sealPattern: '',
  minStreak: '',
};

const SEAL_PATTERNS: LimitSealPattern[] = ['ONE_WORD', 'T_SHAPE', 'NORMAL', 'WEAK'];
const TABS: LimitTabKey[] = ['today', 'next-day', 'history'];

function parseDate(value: string | null): Dayjs | null {
  if (!value) return null;
  const d = dayjs(value, 'YYYYMMDD');
  return d.isValid() ? d : null;
}

function parseInt32(value: string | null): number | '' {
  if (!value) return '';
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : '';
}

/**
 * 将筛选状态序列化进 URL，刷新可恢复。
 * Key 命名缩短便于阅读。
 */
export function useLimitFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const state: LimitFilterState = useMemo(() => {
    const rawTab = searchParams.get('tab');
    const tab: LimitTabKey = (
      TABS.includes(rawTab as LimitTabKey) ? rawTab : 'today'
    ) as LimitTabKey;

    const limitType = (
      ['UP', 'DOWN', 'ALL'].includes(searchParams.get('lt') ?? '') ? searchParams.get('lt') : 'ALL'
    ) as LimitTypeFilter;

    const pctRaw = Number(searchParams.get('pct'));
    const pctChgLimit: PctChgLimit | '' = [5, 10, 20, 30].includes(pctRaw)
      ? (pctRaw as PctChgLimit)
      : '';

    const sealRaw = searchParams.get('sp');
    const sealPattern: LimitSealPattern | '' = SEAL_PATTERNS.includes(sealRaw as LimitSealPattern)
      ? (sealRaw as LimitSealPattern)
      : '';

    const mvRaw = searchParams.get('mv');
    const mvList: MvBucket[] = ['UNDER_50', '50_200', '200_500', '500_1000', 'ABOVE_1000'];
    const mvBucket: MvBucket | '' = mvList.includes(mvRaw as MvBucket) ? (mvRaw as MvBucket) : '';

    return {
      ...DEFAULT_STATE,
      tab,
      tradeDate: parseDate(searchParams.get('d')),
      limitType,
      industry: searchParams.get('ind') ?? '',
      concept: searchParams.get('cpt') ?? '',
      mvBucket,
      pctChgLimit,
      sealPattern,
      minStreak: parseInt32(searchParams.get('ms')),
    };
  }, [searchParams]);

  const update = useCallback(
    (patch: Partial<LimitFilterState>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const setOrDelete = (key: string, val: string | undefined | null) => {
            if (val == null || val === '') next.delete(key);
            else next.set(key, val);
          };

          if ('tab' in patch) setOrDelete('tab', patch.tab === 'today' ? '' : patch.tab);
          if ('tradeDate' in patch)
            setOrDelete('d', patch.tradeDate ? patch.tradeDate.format('YYYYMMDD') : '');
          if ('limitType' in patch)
            setOrDelete('lt', patch.limitType === 'ALL' ? '' : patch.limitType);
          if ('industry' in patch) setOrDelete('ind', patch.industry);
          if ('concept' in patch) setOrDelete('cpt', patch.concept);
          if ('mvBucket' in patch) setOrDelete('mv', patch.mvBucket || '');
          if ('pctChgLimit' in patch)
            setOrDelete('pct', patch.pctChgLimit ? String(patch.pctChgLimit) : '');
          if ('sealPattern' in patch) setOrDelete('sp', patch.sealPattern || '');
          if ('minStreak' in patch)
            setOrDelete('ms', patch.minStreak ? String(patch.minStreak) : '');

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

  return { state, update, reset };
}
