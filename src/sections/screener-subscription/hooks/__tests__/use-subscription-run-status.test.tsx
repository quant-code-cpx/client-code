import type { SubscriptionRunStatus } from 'src/api/screener-subscription';

import { act, renderHook } from '@testing-library/react';

vi.mock('src/api/screener-subscription', () => ({
  getSubscriptionRunStatus: vi.fn(),
}));

import { getSubscriptionRunStatus } from 'src/api/screener-subscription';

import { useSubscriptionRunStatus } from '../use-subscription-run-status';

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useSubscriptionRunStatus', () => {
  it('识别 SKIPPED_DATA_NOT_READY 为携带 errorMessage 的终态并停止轮询', async () => {
    const running: SubscriptionRunStatus = { jobId: 'job-1', status: 'RUNNING' };
    const skipped: SubscriptionRunStatus = {
      jobId: 'job-1',
      status: 'SKIPPED_DATA_NOT_READY',
      errorCode: 'DATA_NOT_READY',
      errorMessage: '数据暂未就绪：daily',
    };
    vi.mocked(getSubscriptionRunStatus)
      .mockResolvedValueOnce(running)
      .mockResolvedValueOnce(skipped);
    const onTerminal = vi.fn();
    const { result } = renderHook(() => useSubscriptionRunStatus({ onTerminal }));

    act(() => result.current.trackRunStatus('job-1'));
    await act(flushMicrotasks);
    expect(result.current.runStatus).toEqual(running);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
      await flushMicrotasks();
    });
    expect(result.current.runStatus).toEqual(skipped);
    expect(onTerminal).toHaveBeenCalledWith(skipped);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(getSubscriptionRunStatus).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: 'NOT_FOUND' as const, errorMessage: null },
    { status: 'FAILED' as const, errorMessage: '订阅规则无效' },
  ])('$status 收到一次即终止，不继续调度', async (terminal) => {
    const response: SubscriptionRunStatus = {
      jobId: 'job-terminal',
      status: terminal.status,
      errorMessage: terminal.errorMessage,
    };
    vi.mocked(getSubscriptionRunStatus).mockResolvedValueOnce(response);
    const { result } = renderHook(() => useSubscriptionRunStatus());

    act(() => result.current.trackRunStatus('job-terminal'));
    await act(flushMicrotasks);
    expect(result.current.runStatus).toEqual(response);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(getSubscriptionRunStatus).toHaveBeenCalledTimes(1);
  });

  it('请求异常映射为带 errorMessage 的 FAILED 终态', async () => {
    vi.mocked(getSubscriptionRunStatus).mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useSubscriptionRunStatus());

    act(() => result.current.trackRunStatus('job-error'));
    await act(flushMicrotasks);

    expect(result.current.runStatus).toEqual({
      jobId: 'job-error',
      status: 'FAILED',
      errorMessage: 'network down',
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    expect(getSubscriptionRunStatus).toHaveBeenCalledTimes(1);
  });
});
