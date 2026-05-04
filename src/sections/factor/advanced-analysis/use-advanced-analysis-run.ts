import { useRef, useState, useCallback } from 'react';

import { extractErrorMessage } from './utils';

// ----------------------------------------------------------------------
// 通用分析运行 Hook
// 统一 loading / error / data / lastRequest，错误透传后端 message
// ----------------------------------------------------------------------

export type AnalysisRunState<TReq, TRes> = {
  data: TRes | null;
  loading: boolean;
  error: string;
  lastRequest: TReq | null;
  lastRunAt: number | null;
  elapsedMs: number | null;
};

export type AnalysisRunResult<TReq, TRes> = AnalysisRunState<TReq, TRes> & {
  run: (req: TReq) => Promise<TRes | null>;
  reset: () => void;
};

export function useAdvancedAnalysisRun<TReq, TRes>(
  fn: (req: TReq) => Promise<TRes>,
  fallbackErrorMsg: string
): AnalysisRunResult<TReq, TRes> {
  const [state, setState] = useState<AnalysisRunState<TReq, TRes>>({
    data: null,
    loading: false,
    error: '',
    lastRequest: null,
    lastRunAt: null,
    elapsedMs: null,
  });

  const reqIdRef = useRef(0);

  const run = useCallback(
    async (req: TReq) => {
      const myId = ++reqIdRef.current;
      const startedAt = Date.now();
      setState((s) => ({
        ...s,
        loading: true,
        error: '',
        lastRequest: req,
      }));
      try {
        const data = await fn(req);
        if (reqIdRef.current !== myId) return null;
        setState({
          data,
          loading: false,
          error: '',
          lastRequest: req,
          lastRunAt: Date.now(),
          elapsedMs: Date.now() - startedAt,
        });
        return data;
      } catch (err) {
        if (reqIdRef.current !== myId) return null;
        setState({
          data: null,
          loading: false,
          error: extractErrorMessage(err, fallbackErrorMsg),
          lastRequest: req,
          lastRunAt: Date.now(),
          elapsedMs: Date.now() - startedAt,
        });
        return null;
      }
    },
    [fn, fallbackErrorMsg]
  );

  const reset = useCallback(() => {
    reqIdRef.current += 1;
    setState({
      data: null,
      loading: false,
      error: '',
      lastRequest: null,
      lastRunAt: null,
      elapsedMs: null,
    });
  }, []);

  return { ...state, run, reset };
}
