import type { ValidateBacktestRunQuery, ValidateBacktestRunResponse } from 'src/api/backtest';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import { validateRun } from 'src/api/backtest';

// ----------------------------------------------------------------------

type UseAutoValidateArgs = {
  query: ValidateBacktestRunQuery;
  enabled: boolean;
  debounceMs?: number;
  onError?: (message: string) => void;
};

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${stableSerialize((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function useAutoValidate({
  query,
  enabled,
  debounceMs = 800,
  onError,
}: UseAutoValidateArgs) {
  const requestIdRef = useRef(0);
  const [validating, setValidating] = useState(false);
  const [validatedHash, setValidatedHash] = useState('');
  const [validation, setValidation] = useState<ValidateBacktestRunResponse | null>(null);

  const queryHash = useMemo(() => stableSerialize(query), [query]);
  const validationStale = validation !== null && validatedHash !== queryHash;

  const validateNow = useCallback(async () => {
    if (!enabled) return null;

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setValidating(true);

    try {
      const response = await validateRun(query);
      if (requestIdRef.current === requestId) {
        setValidation(response);
        setValidatedHash(queryHash);
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : '校验失败';
      if (requestIdRef.current === requestId) {
        onError?.(message);
      }
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setValidating(false);
      }
    }
  }, [enabled, onError, query, queryHash]);

  useEffect(() => {
    if (!enabled) return undefined;

    const timer = window.setTimeout(() => {
      validateNow();
    }, debounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [debounceMs, enabled, queryHash, validateNow]);

  const resetValidation = useCallback(() => {
    setValidation(null);
    setValidatedHash('');
  }, []);

  return {
    validation,
    validating,
    validateNow,
    setValidation,
    validationStale,
    resetValidation,
  };
}
