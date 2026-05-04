import type { BacktestRunListItem } from 'src/api/backtest';

import { useMemo, useEffect } from 'react';

import { getSocket } from 'src/lib/socket';
import { getRunDetail } from 'src/api/backtest';

// ----------------------------------------------------------------------

type RunPatch = Partial<
  Pick<
    BacktestRunListItem,
    | 'status'
    | 'progress'
    | 'completedAt'
    | 'failedReason'
    | 'failedReasonCode'
    | 'failedReasonLabel'
  >
>;

type ProgressPayload = {
  jobId: string;
  runId?: string;
  progress: number;
  status?: string;
  state?: string;
  step?: string;
};

type CompletedPayload = {
  jobId: string;
  runId?: string;
  completedAt?: string;
};

type FailedPayload = {
  jobId: string;
  runId?: string;
  reason?: string;
  failedReason?: string;
  failedReasonCode?: string;
  failedReasonLabel?: string;
};

interface UseBacktestRunWsOptions {
  items: BacktestRunListItem[];
  onPatch: (runId: string, patch: RunPatch) => void;
  onRefresh: () => void;
  disabled?: boolean;
}

const RUNNING_STATUSES = new Set(['QUEUED', 'RUNNING']);
const STATUS_VALUES = new Set(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']);

function resolveStatus(payload: ProgressPayload) {
  const value = payload.status ?? payload.state;
  return value && STATUS_VALUES.has(value) ? value : undefined;
}

export function useBacktestRunWs({ items, onPatch, onRefresh, disabled }: UseBacktestRunWsOptions) {
  const activeItems = useMemo(
    () => items.filter((item) => RUNNING_STATUSES.has(item.status)).slice(0, 20),
    [items]
  );

  const activeKey = activeItems
    .map((item) => `${item.runId}:${item.status}:${item.jobId ?? ''}`)
    .join('|');

  useEffect(() => {
    if (disabled || activeItems.length === 0) return undefined;

    let cancelled = false;
    const socket = getSocket();
    const subscribedJobIds = new Set<string>();
    const runIdByJobId = new Map<string, string>();

    const handleProgress = (payload: ProgressPayload) => {
      const runId = payload.runId ?? runIdByJobId.get(payload.jobId);
      if (!runId) return;
      onPatch(runId, {
        progress: payload.progress,
        status: resolveStatus(payload) ?? 'RUNNING',
      });
    };

    const handleCompleted = (payload: CompletedPayload) => {
      const runId = payload.runId ?? runIdByJobId.get(payload.jobId);
      if (!runId) return;
      onPatch(runId, {
        status: 'COMPLETED',
        progress: 100,
        completedAt: payload.completedAt ?? new Date().toISOString(),
      });
      onRefresh();
    };

    const handleFailed = (payload: FailedPayload) => {
      const runId = payload.runId ?? runIdByJobId.get(payload.jobId);
      if (!runId) return;
      onPatch(runId, {
        status: 'FAILED',
        failedReason: payload.failedReason ?? payload.reason ?? null,
        failedReasonCode: payload.failedReasonCode ?? null,
        failedReasonLabel: payload.failedReasonLabel ?? null,
      });
      onRefresh();
    };

    socket.on('backtest_progress', handleProgress);
    socket.on('backtest_completed', handleCompleted);
    socket.on('backtest_failed', handleFailed);
    socket.connect();

    Promise.allSettled(
      activeItems.map(async (item) => {
        if (item.jobId) return { runId: item.runId, jobId: item.jobId };
        const detail = await getRunDetail(item.runId);
        return { runId: item.runId, jobId: detail.jobId };
      })
    ).then((results) => {
      if (cancelled) return;

      results.forEach((result) => {
        if (result.status !== 'fulfilled' || !result.value.jobId) return;
        const { runId, jobId } = result.value;
        runIdByJobId.set(jobId, runId);
        subscribedJobIds.add(jobId);
        socket.emit('subscribe_backtest', { jobId });
      });
    });

    return () => {
      cancelled = true;
      subscribedJobIds.forEach((jobId) => {
        socket.emit('unsubscribe_backtest', { jobId });
      });
      socket.off('backtest_progress', handleProgress);
      socket.off('backtest_completed', handleCompleted);
      socket.off('backtest_failed', handleFailed);
    };
    // activeKey intentionally captures runId/status/jobId only; items can receive metric patches often.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, disabled, onPatch, onRefresh]);
}
