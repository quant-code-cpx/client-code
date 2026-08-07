import type { NewsCoverageResponse } from 'src/api/news';

import { useState, useEffect, useCallback } from 'react';

import { newsApi } from 'src/api/news';

export type NewsCoverageStatus = 'loading' | 'ready' | 'error';

export type UseNewsCoverageResult = {
  coverage: NewsCoverageResponse | null;
  status: NewsCoverageStatus;
  error: unknown | null;
  refresh: () => void;
};

export function useNewsCoverage(): UseNewsCoverageResult {
  const [refreshKey, setRefreshKey] = useState(0);
  const [coverage, setCoverage] = useState<NewsCoverageResponse | null>(null);
  const [status, setStatus] = useState<NewsCoverageStatus>('loading');
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError(null);

    void newsApi
      .getCoverage({}, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setCoverage(response);
        setStatus('ready');
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted || isAbortError(caught)) return;
        setCoverage(null);
        setError(caught);
        setStatus('error');
      });

    return () => controller.abort();
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((current) => current + 1), []);

  return { coverage, status, error, refresh };
}

function isAbortError(error: unknown): boolean {
  return Boolean(
    error && typeof error === 'object' && 'name' in error && error.name === 'AbortError'
  );
}
