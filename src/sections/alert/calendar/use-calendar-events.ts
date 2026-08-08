import type { CalendarEvent, CalendarResponse, CalendarListParams } from 'src/api/alert';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { alertApi } from 'src/api/alert';

import { filtersToQueryParams } from './types';

import type { FilterState } from './types';

type State = {
  events: CalendarEvent[];
  totalCount: number;
  truncated: boolean;
  currentTradeDate?: string;
  dataAsOf?: string;
  hasLoaded: boolean;
  loading: boolean;
  error: string | null;
};

const INITIAL: State = {
  events: [],
  totalCount: 0,
  truncated: false,
  hasLoaded: false,
  loading: true,
  error: null,
};

const DEBOUNCE_MS = 200;

export function useCalendarEvents(filters: FilterState) {
  const [state, setState] = useState<State>(INITIAL);
  const requestSequenceRef = useRef(0);
  const activeControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryKey = JSON.stringify(filtersToQueryParams(filters));
  const query = useMemo(
    () => JSON.parse(queryKey) as CalendarListParams,
    [queryKey]
  );

  const runRequest = useCallback(async () => {
      if (!query.startDate || !query.endDate) return;
      activeControllerRef.current?.abort();
      const controller = new AbortController();
      activeControllerRef.current = controller;
      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data: CalendarResponse = await alertApi.getCalendar(
          { ...query, pageSize: 1000 },
          controller.signal
        );
        if (controller.signal.aborted || requestSequence !== requestSequenceRef.current) return;
        setState({
          events: data.events ?? [],
          totalCount: data.totalCount ?? data.events?.length ?? 0,
          truncated: data.truncated ?? false,
          currentTradeDate: data.currentTradeDate,
          dataAsOf: data.dataAsOf,
          hasLoaded: true,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (controller.signal.aborted || requestSequence !== requestSequenceRef.current) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : '加载事件数据失败',
        }));
      } finally {
        if (activeControllerRef.current === controller) activeControllerRef.current = null;
      }
    }, [query]);

  useEffect(() => {
    requestSequenceRef.current += 1;
    activeControllerRef.current?.abort();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setState((prev) => ({ ...prev, loading: true, error: null }));
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runRequest();
    }, DEBOUNCE_MS);
    return () => {
      requestSequenceRef.current += 1;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      activeControllerRef.current?.abort();
    };
  }, [runRequest]);

  const refresh = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    void runRequest();
  }, [runRequest]);

  return {
    ...state,
    refresh,
    initialLoading: state.loading && !state.hasLoaded,
    refreshing: state.loading && state.hasLoaded,
  };
}
