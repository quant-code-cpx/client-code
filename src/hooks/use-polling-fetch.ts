import { useRef, useEffect, useCallback } from 'react';

// ─── usePollingFetch ──────────────────────────────────────────────────────────
//
// The hook keeps one request in flight at a time. Visibility/enabled changes that
// happen during a request are coalesced into at most one immediate follow-up.
// ─────────────────────────────────────────────────────────────────────────────

export type UsePollingFetchOptions = {
  /** Normal poll interval in milliseconds (default 30 000) */
  interval?: number;
  /** Fast poll interval in milliseconds – used when fastWhen() returns true */
  fastInterval?: number;
  /** Returns true when the fast interval should be used */
  fastWhen?: () => boolean;
  /** Pause polling when the tab is hidden (default true) */
  pauseWhenHidden?: boolean;
  /** Master switch; polling is disabled when false (default true) */
  enabled?: boolean;
};

export function usePollingFetch(
  fetchFn: () => Promise<void>,
  options: UsePollingFetchOptions = {}
) {
  const {
    interval = 30_000,
    fastInterval = 5_000,
    fastWhen,
    pauseWhenHidden = true,
    enabled = true,
  } = options;

  const fetchRef = useRef(fetchFn);
  const fastWhenRef = useRef(fastWhen);
  const intervalRef = useRef(interval);
  const fastIntervalRef = useRef(fastInterval);
  const pauseWhenHiddenRef = useRef(pauseWhenHidden);
  const enabledRef = useRef(enabled);
  const mountedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const rerunRequestedRef = useRef(false);
  const failCountRef = useRef(0);
  const runRef = useRef<(() => Promise<void>) | null>(null);

  fetchRef.current = fetchFn;
  fastWhenRef.current = fastWhen;
  intervalRef.current = interval;
  fastIntervalRef.current = fastInterval;
  pauseWhenHiddenRef.current = pauseWhenHidden;
  enabledRef.current = enabled;

  const clearScheduled = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const canRun = useCallback(
    () =>
      mountedRef.current &&
      enabledRef.current &&
      (!pauseWhenHiddenRef.current || document.visibilityState === 'visible'),
    []
  );

  const schedule = useCallback(() => {
    clearScheduled();
    if (!canRun() || inFlightRef.current) return;

    const effectiveInterval =
      failCountRef.current >= 3
        ? 60_000
        : fastWhenRef.current?.()
          ? fastIntervalRef.current
          : intervalRef.current;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runRef.current?.();
    }, effectiveInterval);
  }, [canRun, clearScheduled]);

  const run = useCallback(async (): Promise<void> => {
    if (!canRun()) return;
    clearScheduled();

    if (inFlightRef.current) {
      rerunRequestedRef.current = true;
      await inFlightRef.current;
      return;
    }

    const task = (async () => {
      try {
        await fetchRef.current();
        failCountRef.current = 0;
      } catch {
        failCountRef.current += 1;
      }
    })();
    inFlightRef.current = task;

    try {
      await task;
    } finally {
      if (inFlightRef.current === task) inFlightRef.current = null;
    }

    if (!canRun()) {
      rerunRequestedRef.current = false;
      return;
    }
    if (rerunRequestedRef.current) {
      rerunRequestedRef.current = false;
      void runRef.current?.();
    } else {
      schedule();
    }
  }, [canRun, clearScheduled, schedule]);

  runRef.current = run;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      rerunRequestedRef.current = false;
      clearScheduled();
    };
  }, [clearScheduled]);

  useEffect(() => {
    clearScheduled();
    if (!enabled) {
      rerunRequestedRef.current = false;
      return;
    }
    if (pauseWhenHidden && document.visibilityState !== 'visible') return;
    void runRef.current?.();
  }, [clearScheduled, enabled, pauseWhenHidden]);

  useEffect(() => {
    if (!pauseWhenHidden) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') {
        clearScheduled();
        return;
      }
      if (enabledRef.current) void runRef.current?.();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [clearScheduled, pauseWhenHidden]);

  // Apply a changed interval to the next idle wait without starting another request.
  useEffect(() => {
    if (inFlightRef.current) return;
    schedule();
  }, [fastInterval, interval, schedule]);

  return { reschedule: schedule };
}
