import type { SubscriptionRunStatus } from 'src/api/screener-subscription';

import { useRef, useState, useEffect, useCallback } from 'react';

import { getSubscriptionRunStatus } from 'src/api/screener-subscription';

const POLL_INTERVAL_MS = 2000;

export const SUBSCRIPTION_RUN_TERMINAL_STATUSES = new Set<SubscriptionRunStatus['status']>([
  'SUCCESS',
  'FAILED',
  'SKIPPED_DATA_NOT_READY',
  'NOT_FOUND',
]);

type Options = {
  onTerminal?: (status: SubscriptionRunStatus) => void;
};

export function useSubscriptionRunStatus({ onTerminal }: Options = {}) {
  const [runStatus, setRunStatus] = useState<SubscriptionRunStatus | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const mountedRef = useRef(true);
  const onTerminalRef = useRef(onTerminal);
  const pollRef = useRef<((jobId: string, generation: number) => Promise<void>) | null>(null);

  onTerminalRef.current = onTerminal;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const poll = useCallback(
    async (jobId: string, generation: number): Promise<void> => {
      try {
        const nextStatus = await getSubscriptionRunStatus(jobId);
        if (!mountedRef.current || generation !== generationRef.current) return;
        setRunStatus(nextStatus);

        if (SUBSCRIPTION_RUN_TERMINAL_STATUSES.has(nextStatus.status)) {
          clearTimer();
          onTerminalRef.current?.(nextStatus);
          return;
        }

        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void pollRef.current?.(jobId, generation);
        }, POLL_INTERVAL_MS);
      } catch (error) {
        if (!mountedRef.current || generation !== generationRef.current) return;
        clearTimer();
        const failedStatus: SubscriptionRunStatus = {
          jobId,
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : '执行状态查询失败',
        };
        setRunStatus(failedStatus);
        onTerminalRef.current?.(failedStatus);
      }
    },
    [clearTimer]
  );

  pollRef.current = poll;

  const trackRunStatus = useCallback(
    (jobId: string) => {
      generationRef.current += 1;
      const generation = generationRef.current;
      clearTimer();
      setRunStatus({ jobId, status: 'QUEUED' });
      void pollRef.current?.(jobId, generation);
    },
    [clearTimer]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      clearTimer();
    };
  }, [clearTimer]);

  return { runStatus, trackRunStatus };
}
