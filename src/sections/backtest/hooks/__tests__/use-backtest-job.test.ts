/** @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react';

import { getSocket } from 'src/lib/socket';

import { useBacktestJob } from '../use-backtest-job';

const socket = vi.hoisted(() => ({
  connect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock('src/lib/socket', () => ({ getSocket: vi.fn(() => socket) }));

describe('useBacktestJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('无 jobId 不连接；有 jobId 订阅三类事件并在卸载时完整清理', () => {
    const onProgress = vi.fn();
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ jobId }) => useBacktestJob(jobId, { onProgress, onCompleted, onFailed }),
      { initialProps: { jobId: null as string | null } }
    );

    expect(getSocket).not.toHaveBeenCalled();
    rerender({ jobId: 'job-1' });

    expect(socket.connect).toHaveBeenCalledTimes(1);
    expect(socket.emit).toHaveBeenCalledWith('subscribe_backtest', { jobId: 'job-1' });
    expect(socket.on.mock.calls.map(([event]) => event)).toEqual([
      'backtest_progress',
      'backtest_completed',
      'backtest_failed',
    ]);

    const handlers = Object.fromEntries(socket.on.mock.calls);
    act(() => {
      handlers.backtest_progress({ jobId: 'job-1', progress: 42, step: '撮合' });
      handlers.backtest_completed({ jobId: 'job-1', runId: 'run-1' });
      handlers.backtest_failed({ jobId: 'job-1', reason: '数据不足' });
    });
    expect(onProgress).toHaveBeenCalledWith({ jobId: 'job-1', progress: 42, step: '撮合' });
    expect(onCompleted).toHaveBeenCalledWith({ jobId: 'job-1', runId: 'run-1' });
    expect(onFailed).toHaveBeenCalledWith({ jobId: 'job-1', reason: '数据不足' });

    unmount();
    expect(socket.emit).toHaveBeenLastCalledWith('unsubscribe_backtest', { jobId: 'job-1' });
    expect(socket.off).toHaveBeenCalledTimes(3);
  });

  it('事件处理器读取最新 callback，不因首次 render 闭包过期', () => {
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = renderHook(
      ({ onProgress }) => useBacktestJob('job-1', { onProgress }),
      { initialProps: { onProgress: first } }
    );
    const progressHandler = socket.on.mock.calls.find(
      ([event]) => event === 'backtest_progress'
    )?.[1];

    rerender({ onProgress: latest });
    act(() => progressHandler({ jobId: 'job-1', progress: 80, step: '统计' }));

    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });
});
