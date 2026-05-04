import type { BacktestRunListItem } from 'src/api/backtest';

import { useState, useEffect, useCallback } from 'react';

import { listRuns } from 'src/api/backtest';

// ----------------------------------------------------------------------

type RunningRunsState = {
  total: number;
  items: BacktestRunListItem[];
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

export function useRunningRunsBadge(refreshToken = 0): RunningRunsState {
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<BacktestRunListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [queued, running] = await Promise.all([
        listRuns({ page: 1, pageSize: 5, status: 'QUEUED' }),
        listRuns({ page: 1, pageSize: 5, status: 'RUNNING' }),
      ]);
      const merged = [...(running.items ?? []), ...(queued.items ?? [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      setItems(merged);
      setTotal((queued.total ?? 0) + (running.total ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : '运行中任务加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const timer = window.setInterval(() => {
      refresh();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [refresh, refreshToken]);

  return { total, items, loading, error, refresh };
}
