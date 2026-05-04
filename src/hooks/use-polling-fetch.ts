import { useRef, useEffect, useCallback } from 'react';

// ─── usePollingFetch ──────────────────────────────────────────────────────────
//
// Usage:
//   usePollingFetch(fetchFn, {
//     interval: 30_000,           // default poll interval (ms)
//     fastInterval: 5_000,        // optional fast interval when fastWhen() is true
//     fastWhen: () => hasRunning, // condition to switch to fast interval
//     pauseWhenHidden: true,      // pause when document not visible (default true)
//     enabled: true,              // master switch (default true)
//   })
//
// The hook fires fetchFn immediately on mount (and whenever deps change),
// then re-fires on the chosen interval. Interval switches dynamically.
// On unmount the timer is cleared.
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

  // Keep latest fetchFn and options refs so the interval callback always calls
  // the most-current version without restarting the timer.
  const fetchRef = useRef(fetchFn);
  const fastWhenRef = useRef(fastWhen);
  useEffect(() => {
    fetchRef.current = fetchFn;
  });
  useEffect(() => {
    fastWhenRef.current = fastWhen;
  });

  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failCountRef = useRef(0);

  const clearScheduled = useCallback(() => {
    if (scheduleRef.current !== null) {
      clearTimeout(scheduleRef.current);
      scheduleRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clearScheduled();
    if (!enabled) return;
    if (pauseWhenHidden && document.visibilityState === 'hidden') return;

    // Backoff: after 3 consecutive failures drop to 60 s
    const effectiveInterval =
      failCountRef.current >= 3 ? 60_000 : fastWhenRef.current?.() ? fastInterval : interval;

    scheduleRef.current = setTimeout(async () => {
      try {
        await fetchRef.current();
        failCountRef.current = 0;
      } catch {
        failCountRef.current += 1;
      }
      schedule();
    }, effectiveInterval);
  }, [clearScheduled, enabled, fastInterval, interval, pauseWhenHidden]);

  useEffect(() => {
    if (!enabled) return undefined;

    // Fire immediately on mount
    (async () => {
      try {
        await fetchRef.current();
        failCountRef.current = 0;
      } catch {
        failCountRef.current += 1;
      }
      schedule();
    })();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Resume: fire immediately and reschedule
        clearScheduled();
        (async () => {
          try {
            await fetchRef.current();
            failCountRef.current = 0;
          } catch {
            failCountRef.current += 1;
          }
          schedule();
        })();
      } else {
        // Pause
        clearScheduled();
      }
    };

    if (pauseWhenHidden) {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearScheduled();
      if (pauseWhenHidden) {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { reschedule: schedule };
}
