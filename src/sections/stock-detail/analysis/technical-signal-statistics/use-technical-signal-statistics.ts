import type {
  TechnicalSignalPeriod,
  TechnicalSignalSelector,
  TechnicalSignalEntryMode,
  TechnicalSignalDefinition,
  TechnicalSignalStatisticsResponse,
} from 'src/api/technical-signal';

import { useRef, useState, useEffect, useCallback } from 'react';

import { technicalSignalApi } from 'src/api/technical-signal';

import {
  isAbortError,
  normalizeHorizons,
  toCompactTradeDate,
  DEFAULT_SIGNAL_PERIODS,
  DEFAULT_SIGNAL_HORIZONS,
} from './technical-signal-formatters';

// ----------------------------------------------------------------------

export type TechnicalSignalStatisticsFilters = {
  signals: TechnicalSignalSelector[];
  periods: TechnicalSignalPeriod[];
  customStartDate: string;
  customEndDate: string;
  horizons: number[];
  entryMode: TechnicalSignalEntryMode;
  includeBenchmark: boolean;
};

export type AsyncDataState<T> = {
  data: T | null;
  error: unknown;
  loading: boolean;
  refreshing: boolean;
};

const defaultFilters = (): TechnicalSignalStatisticsFilters => ({
  signals: [],
  periods: [...DEFAULT_SIGNAL_PERIODS],
  customStartDate: '',
  customEndDate: '',
  horizons: [...DEFAULT_SIGNAL_HORIZONS],
  entryMode: 'SIGNAL_CLOSE',
  includeBenchmark: true,
});

function validateFilters(filters: TechnicalSignalStatisticsFilters): string | null {
  if (filters.periods.length === 0) return '请至少选择一个统计区间';
  if (filters.horizons.length === 0) return '请至少选择一个观察周期';
  if (filters.horizons.length > 10) return '观察周期最多选择 10 个';
  if (filters.periods.includes('CUSTOM') && !filters.customStartDate) {
    return '自定义区间需要填写开始日期';
  }
  if (
    filters.customStartDate &&
    filters.customEndDate &&
    toCompactTradeDate(filters.customStartDate) > toCompactTradeDate(filters.customEndDate)
  ) {
    return '自定义开始日期不能晚于结束日期';
  }
  return null;
}

function normalizeFilters(filters: TechnicalSignalStatisticsFilters): TechnicalSignalStatisticsFilters {
  return {
    ...filters,
    horizons: normalizeHorizons(filters.horizons),
    periods: [...new Set(filters.periods)],
  };
}

function buildStatisticsRequest(tsCode: string, filters: TechnicalSignalStatisticsFilters) {
  const request = {
    tsCode,
    periods: filters.periods,
    horizons: filters.horizons,
    entryMode: filters.entryMode,
    includeBenchmark: filters.includeBenchmark,
    ...(filters.signals.length > 0 ? { signals: filters.signals } : {}),
  };

  if (!filters.periods.includes('CUSTOM')) return request;

  return {
    ...request,
    customStartDate: toCompactTradeDate(filters.customStartDate),
    ...(filters.customEndDate
      ? { customEndDate: toCompactTradeDate(filters.customEndDate) }
      : {}),
  };
}

export function useTechnicalSignalStatistics(tsCode: string, enabled: boolean) {
  const catalogAbortRef = useRef<AbortController | null>(null);
  const summaryAbortRef = useRef<AbortController | null>(null);
  const catalogSequenceRef = useRef(0);
  const summarySequenceRef = useRef(0);
  const [catalog, setCatalog] = useState<AsyncDataState<TechnicalSignalDefinition[]>>({
    data: null,
    error: null,
    loading: false,
    refreshing: false,
  });
  const [summary, setSummary] = useState<AsyncDataState<TechnicalSignalStatisticsResponse>>({
    data: null,
    error: null,
    loading: false,
    refreshing: false,
  });
  const [summaryTsCode, setSummaryTsCode] = useState(tsCode);
  const [draftFilters, setDraftFilters] = useState<TechnicalSignalStatisticsFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<TechnicalSignalStatisticsFilters>(defaultFilters);
  const [validationError, setValidationError] = useState<string | null>(null);

  const cancelCatalogRequest = useCallback(() => {
    catalogAbortRef.current?.abort();
    catalogAbortRef.current = null;
  }, []);

  const cancelSummaryRequest = useCallback(() => {
    summaryAbortRef.current?.abort();
    summaryAbortRef.current = null;
  }, []);

  const loadCatalog = useCallback(async () => {
    cancelCatalogRequest();
    const controller = new AbortController();
    const sequence = catalogSequenceRef.current + 1;
    catalogAbortRef.current = controller;
    catalogSequenceRef.current = sequence;

    setCatalog((current) => ({ ...current, error: null, loading: !current.data, refreshing: !!current.data }));

    try {
      const definitions = await technicalSignalApi.listDefinitions(
        { includeDeprecated: false },
        controller.signal
      );
      if (catalogSequenceRef.current !== sequence) return;
      setCatalog({ data: definitions, error: null, loading: false, refreshing: false });
    } catch (error) {
      if (isAbortError(error) || catalogSequenceRef.current !== sequence) return;
      setCatalog((current) => ({ ...current, error, loading: false, refreshing: false }));
    }
  }, [cancelCatalogRequest]);

  const requestSummary = useCallback(
    async (filters: TechnicalSignalStatisticsFilters) => {
      const normalizedFilters = normalizeFilters(filters);
      const filterError = validateFilters(normalizedFilters);
      if (filterError) {
        setValidationError(filterError);
        return false;
      }

      cancelSummaryRequest();
      const controller = new AbortController();
      const sequence = summarySequenceRef.current + 1;
      summaryAbortRef.current = controller;
      summarySequenceRef.current = sequence;
      setSummaryTsCode(tsCode);
      setValidationError(null);
      setSummary((current) => ({
        ...current,
        error: null,
        loading: !current.data,
        refreshing: !!current.data,
      }));

      try {
        const data = await technicalSignalApi.queryStatistics(
          buildStatisticsRequest(tsCode, normalizedFilters),
          controller.signal
        );
        if (summarySequenceRef.current !== sequence) return false;
        setSummary({ data, error: null, loading: false, refreshing: false });
        return true;
      } catch (error) {
        if (isAbortError(error) || summarySequenceRef.current !== sequence) return false;
        setSummary((current) => ({ ...current, error, loading: false, refreshing: false }));
        return false;
      }
    },
    [cancelSummaryRequest, tsCode]
  );

  const applyFilters = useCallback(
    async (filters = draftFilters) => {
      const normalizedFilters = normalizeFilters(filters);
      const applied = await requestSummary(normalizedFilters);
      if (applied) setAppliedFilters(normalizedFilters);
      return applied;
    },
    [draftFilters, requestSummary]
  );

  const updateDraftFilters = useCallback(
    (update: Partial<TechnicalSignalStatisticsFilters>) => {
      setDraftFilters((current) => ({ ...current, ...update }));
      setValidationError(null);
    },
    []
  );

  const retrySummary = useCallback(() => requestSummary(appliedFilters), [appliedFilters, requestSummary]);

  useEffect(() => {
    if (!enabled || !tsCode) return undefined;

    const initialFilters = defaultFilters();
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setValidationError(null);
    setSummaryTsCode(tsCode);
    setSummary({ data: null, error: null, loading: true, refreshing: false });
    void loadCatalog();
    void requestSummary(initialFilters);

    return () => {
      cancelCatalogRequest();
      cancelSummaryRequest();
    };
  }, [cancelCatalogRequest, cancelSummaryRequest, enabled, loadCatalog, requestSummary, tsCode]);

  const visibleSummary =
    summaryTsCode === tsCode
      ? summary
      : { data: null, error: null, loading: Boolean(enabled && tsCode), refreshing: false };

  return {
    appliedFilters,
    applyFilters,
    catalog,
    draftFilters,
    retryCatalog: loadCatalog,
    retrySummary,
    summary: visibleSummary,
    updateDraftFilters,
    validationError,
  };
}
