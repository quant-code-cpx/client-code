import { act, renderHook } from '@testing-library/react';

import { usePollingFetch } from '../use-polling-fetch';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

describe('usePollingFetch', () => {
  it('保持 single-flight，并把多次 visibility 恢复合并为一次后续请求', async () => {
    const first = deferred<void>();
    const fetchFn = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(undefined);

    renderHook(() =>
      usePollingFetch(fetchFn, { interval: 1000, pauseWhenHidden: true, enabled: true })
    );
    await act(flushMicrotasks);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    act(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve();
      await first.promise;
      await flushMicrotasks();
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('disabled 或卸载后，即使在途请求完成也不再调度', async () => {
    const pending = deferred<void>();
    const fetchFn = vi.fn().mockReturnValueOnce(pending.promise).mockResolvedValue(undefined);
    const { rerender, unmount } = renderHook(
      ({ enabled }) => usePollingFetch(fetchFn, { interval: 1000, enabled }),
      { initialProps: { enabled: true } }
    );
    await act(flushMicrotasks);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });
    await act(async () => {
      pending.resolve();
      await pending.promise;
      await flushMicrotasks();
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    rerender({ enabled: true });
    await act(flushMicrotasks);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});
