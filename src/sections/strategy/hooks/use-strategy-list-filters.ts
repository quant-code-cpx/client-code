import { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// ----------------------------------------------------------------------

export type StrategyListFilter = {
  strategyType: string;
  keyword: string;
  tags: string[];
  view: 'card' | 'table';
  minTotalReturn: string;
  minSharpeRatio: string;
  hasActiveSignal: boolean;
};

// ----------------------------------------------------------------------

export function useStrategyListFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filter = useMemo<StrategyListFilter>(() => {
    const tagsRaw = searchParams.get('tags');
    return {
      strategyType: searchParams.get('type') ?? '',
      keyword: searchParams.get('keyword') ?? '',
      tags: tagsRaw ? tagsRaw.split(',').filter(Boolean) : [],
      view: (searchParams.get('view') as 'card' | 'table') === 'table' ? 'table' : 'card',
      minTotalReturn: searchParams.get('minReturn') ?? '',
      minSharpeRatio: searchParams.get('minSharpe') ?? '',
      hasActiveSignal: searchParams.get('activeSignal') === '1',
    };
  }, [searchParams]);

  const setFilter = useCallback(
    (patch: Partial<StrategyListFilter>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const merged = { ...filter, ...patch };

          if (merged.strategyType) next.set('type', merged.strategyType);
          else next.delete('type');

          if (merged.keyword) next.set('keyword', merged.keyword);
          else next.delete('keyword');

          if (merged.tags.length > 0) next.set('tags', merged.tags.join(','));
          else next.delete('tags');

          if (merged.view !== 'card') next.set('view', merged.view);
          else next.delete('view');

          if (merged.minTotalReturn) next.set('minReturn', merged.minTotalReturn);
          else next.delete('minReturn');

          if (merged.minSharpeRatio) next.set('minSharpe', merged.minSharpeRatio);
          else next.delete('minSharpe');

          if (merged.hasActiveSignal) next.set('activeSignal', '1');
          else next.delete('activeSignal');

          return next;
        },
        { replace: true }
      );
    },
    [filter, setSearchParams]
  );

  const resetFilter = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const isFiltered =
    Boolean(filter.strategyType) ||
    Boolean(filter.keyword) ||
    filter.tags.length > 0 ||
    Boolean(filter.minTotalReturn) ||
    Boolean(filter.minSharpeRatio) ||
    filter.hasActiveSignal;

  return { filter, setFilter, resetFilter, isFiltered };
}
