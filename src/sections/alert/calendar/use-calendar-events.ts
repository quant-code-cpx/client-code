import type { CalendarEvent, CalendarResponse } from 'src/api/alert';

import { useState, useEffect, useCallback } from 'react';

import { alertApi } from 'src/api/alert';

import { filtersToQueryParams } from './types';

import type { FilterState } from './types';

type State = {
  events: CalendarEvent[];
  totalCount: number;
  truncated: boolean;
  currentTradeDate?: string;
  dataAsOf?: string;
  loading: boolean;
  error: string | null;
};

const INITIAL: State = {
  events: [],
  totalCount: 0,
  truncated: false,
  loading: true,
  error: null,
};

const DEBOUNCE_MS = 200;

export function useCalendarEvents(filters: FilterState) {
  const [state, setState] = useState<State>(INITIAL);

  const fetchEvents = useCallback(
    async (signal: AbortSignal) => {
      if (!filters.startDate || !filters.endDate) return;
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const data: CalendarResponse = await alertApi.getCalendar(
          { ...filtersToQueryParams(filters), pageSize: 1000 },
          signal
        );
        if (signal.aborted) return;
        setState({
          events: data.events ?? [],
          totalCount: data.totalCount ?? data.events?.length ?? 0,
          truncated: data.truncated ?? false,
          currentTradeDate: data.currentTradeDate,
          dataAsOf: data.dataAsOf,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : '加载事件数据失败',
        }));
      }
    },
    [filters]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchEvents(controller.signal);
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fetchEvents]);

  const refresh = useCallback(() => {
    const controller = new AbortController();
    fetchEvents(controller.signal);
  }, [fetchEvents]);

  return { ...state, refresh };
}
