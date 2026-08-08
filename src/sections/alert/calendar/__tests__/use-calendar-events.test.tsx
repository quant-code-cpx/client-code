import type { CalendarResponse } from 'src/api/alert';

import { act, renderHook } from '@testing-library/react';

import { useCalendarEvents } from '../use-calendar-events';

import type { FilterState } from '../types';

const mocks = vi.hoisted(() => ({ getCalendar: vi.fn() }));

vi.mock('src/api/alert', () => ({
  alertApi: { getCalendar: mocks.getCalendar },
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

const BASE_FILTERS: FilterState = {
  startDate: '20260808',
  endDate: '20260821',
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

function deferred<T>(): Deferred<T> {
  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

function response(title: string): CalendarResponse {
  return {
    startDate: '20260808',
    endDate: '20260821',
    totalCount: 1,
    events: [
      {
        id: title,
        date: '20260808',
        tsCode: '000001.SZ',
        stockName: '平安银行',
        type: 'DISCLOSURE',
        title,
        detail: null,
      },
    ],
  };
}

async function advanceDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
}

async function resolveRequest(pending: Deferred<CalendarResponse>, value: CalendarResponse) {
  await act(async () => {
    pending.resolve(value);
    await pending.promise;
  });
}

describe('useCalendarEvents 请求管理', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('CAL-B10: 快速筛选只允许最后一次响应写入', async () => {
    const requestA = deferred<CalendarResponse>();
    const requestB = deferred<CalendarResponse>();
    mocks.getCalendar.mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise);
    const hook = renderHook(({ filters }) => useCalendarEvents(filters), {
      initialProps: { filters: BASE_FILTERS },
    });

    await advanceDebounce();
    const signalA = mocks.getCalendar.mock.calls[0][1] as AbortSignal;
    hook.rerender({ filters: { ...BASE_FILTERS, keyword: '银行' } });
    expect(signalA.aborted).toBe(true);
    await advanceDebounce();

    await resolveRequest(requestB, response('结果 B'));
    expect(hook.result.current.events[0].title).toBe('结果 B');
    await resolveRequest(requestA, response('旧结果 A'));
    expect(hook.result.current.events[0].title).toBe('结果 B');
  });

  it('CAL-B10: 手动刷新取消旧自动请求，旧响应不能覆盖刷新结果', async () => {
    const automatic = deferred<CalendarResponse>();
    const manual = deferred<CalendarResponse>();
    mocks.getCalendar.mockReturnValueOnce(automatic.promise).mockReturnValueOnce(manual.promise);
    const hook = renderHook(() => useCalendarEvents(BASE_FILTERS));

    await advanceDebounce();
    const automaticSignal = mocks.getCalendar.mock.calls[0][1] as AbortSignal;
    act(() => hook.result.current.refresh());
    expect(automaticSignal.aborted).toBe(true);

    await resolveRequest(manual, response('手动刷新结果'));
    await resolveRequest(automatic, response('旧自动结果'));
    expect(hook.result.current.events[0].title).toBe('手动刷新结果');
  });

  it('CAL-B11: 后续更新保留旧集合并暴露 refreshing 状态', async () => {
    const first = deferred<CalendarResponse>();
    const second = deferred<CalendarResponse>();
    mocks.getCalendar.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const hook = renderHook(({ filters }) => useCalendarEvents(filters), {
      initialProps: { filters: BASE_FILTERS },
    });

    await advanceDebounce();
    await resolveRequest(first, response('稳定旧结果'));
    hook.rerender({ filters: { ...BASE_FILTERS, keyword: '更新' } });

    expect(hook.result.current.events[0].title).toBe('稳定旧结果');
    expect(hook.result.current.refreshing).toBe(true);
    await advanceDebounce();
    await resolveRequest(second, response('更新结果'));
    expect(hook.result.current.events[0].title).toBe('更新结果');
  });

  it('CAL-B12: 只切 view 不产生 calendar/list 请求', async () => {
    mocks.getCalendar.mockResolvedValue(response('同一集合'));
    const hook = renderHook(({ filters }) => useCalendarEvents(filters), {
      initialProps: { filters: BASE_FILTERS },
    });

    await advanceDebounce();
    expect(mocks.getCalendar).toHaveBeenCalledTimes(1);
    hook.rerender({ filters: { ...BASE_FILTERS, view: 'timeline' } });
    await advanceDebounce();

    expect(mocks.getCalendar).toHaveBeenCalledTimes(1);
    expect(hook.result.current.events[0].title).toBe('同一集合');
  });
});
