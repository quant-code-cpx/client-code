/** @vitest-environment jsdom */

import type { ValidateBacktestRunQuery, ValidateBacktestRunResponse } from 'src/api/backtest';

import { act, renderHook } from '@testing-library/react';

import { validateRun } from 'src/api/backtest';

import { useAutoValidate } from '../use-auto-validate';

vi.mock('src/api/backtest', () => ({ validateRun: vi.fn() }));

describe('useAutoValidate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disabled 时不发请求，显式校验返回 null', async () => {
    const { result } = renderHook(() => useAutoValidate({ query: query(), enabled: false }));

    await expect(result.current.validateNow()).resolves.toBeNull();
    expect(validateRun).not.toHaveBeenCalled();
  });

  it('并发校验只提交最后一次结果，旧响应不能覆盖新状态', async () => {
    const first = deferred<ValidateBacktestRunResponse>();
    const second = deferred<ValidateBacktestRunResponse>();
    vi.mocked(validateRun).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderHook(() =>
      useAutoValidate({ query: query(), enabled: true, debounceMs: 60_000 })
    );

    let firstCall!: Promise<ValidateBacktestRunResponse | null>;
    let secondCall!: Promise<ValidateBacktestRunResponse | null>;
    act(() => {
      firstCall = result.current.validateNow();
      secondCall = result.current.validateNow();
    });

    await act(async () => {
      second.resolve(validation(222));
      await secondCall;
    });
    expect(result.current.validation?.stats.tradingDays).toBe(222);
    expect(result.current.validating).toBe(false);

    await act(async () => {
      first.resolve(validation(111));
      await firstCall;
    });
    expect(result.current.validation?.stats.tradingDays).toBe(222);
  });

  it('失败时清理旧结果、结束 loading 并回传可见错误', async () => {
    const onError = vi.fn();
    vi.mocked(validateRun)
      .mockResolvedValueOnce(validation(100))
      .mockRejectedValueOnce(new Error('校验服务不可用'));
    const { result } = renderHook(() =>
      useAutoValidate({ query: query(), enabled: true, debounceMs: 60_000, onError })
    );

    await act(async () => {
      await result.current.validateNow();
    });
    expect(result.current.validation).not.toBeNull();

    await act(async () => {
      await result.current.validateNow();
    });
    expect(result.current.validation).toBeNull();
    expect(result.current.validating).toBe(false);
    expect(onError).toHaveBeenCalledWith('校验服务不可用');
  });
});

function query(): ValidateBacktestRunQuery {
  return {
    strategyType: 'MA_CROSS_SINGLE',
    strategyConfig: { fast: 5, slow: 20 },
    startDate: '20250101',
    endDate: '20251231',
    initialCapital: 1_000_000,
  };
}

function validation(tradingDays: number): ValidateBacktestRunResponse {
  return {
    isValid: true,
    warnings: [],
    errors: [],
    dataReadiness: {
      hasDaily: true,
      hasAdjFactor: true,
      hasTradeCal: true,
      hasIndexDaily: true,
      hasStkLimit: true,
      hasSuspendD: true,
      hasIndexWeight: true,
    },
    stats: {
      tradingDays,
      estimatedUniverseSize: 300,
      earliestAvailableDate: '20250101',
      latestAvailableDate: '20251231',
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
