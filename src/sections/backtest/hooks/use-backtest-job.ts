import { useRef, useEffect } from 'react';

import { getSocket } from 'src/lib/socket';

// ----------------------------------------------------------------------

export type BacktestProgressEvent = {
  jobId: string;
  progress: number;
  step: string;
};

export type BacktestCompletedEvent = {
  jobId: string;
  runId: string;
};

export type BacktestFailedEvent = {
  jobId: string;
  reason: string;
};

interface UseBacktestJobOptions {
  onProgress?: (evt: BacktestProgressEvent) => void;
  onCompleted?: (evt: BacktestCompletedEvent) => void;
  onFailed?: (evt: BacktestFailedEvent) => void;
}

export function useBacktestJob(
  jobId: string | null | undefined,
  options: UseBacktestJobOptions = {}
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!jobId) return undefined;

    const socket = getSocket();
    socket.connect();
    socket.emit('subscribe_backtest', { jobId });

    const handleProgress = (evt: BacktestProgressEvent) => {
      optionsRef.current.onProgress?.(evt);
    };

    const handleCompleted = (evt: BacktestCompletedEvent) => {
      optionsRef.current.onCompleted?.(evt);
    };

    const handleFailed = (evt: BacktestFailedEvent) => {
      optionsRef.current.onFailed?.(evt);
    };

    socket.on('backtest_progress', handleProgress);
    socket.on('backtest_completed', handleCompleted);
    socket.on('backtest_failed', handleFailed);

    return () => {
      socket.emit('unsubscribe_backtest', { jobId });
      socket.off('backtest_progress', handleProgress);
      socket.off('backtest_completed', handleCompleted);
      socket.off('backtest_failed', handleFailed);
    };
  }, [jobId]);
}
