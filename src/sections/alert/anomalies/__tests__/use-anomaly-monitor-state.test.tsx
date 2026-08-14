import type { AnomalyListResponse } from 'src/api/alert';

import { MemoryRouter } from 'react-router-dom';
import { act, waitFor, renderHook } from '@testing-library/react';

import { alertApi } from 'src/api/alert';
import { getSocket } from 'src/lib/socket';

import { useAnomalyMonitorState } from '../use-anomaly-monitor-state';

vi.mock('src/api/alert', () => ({
  alertApi: { getAnomalies: vi.fn() },
}));

const socketHandlers = vi.hoisted(
  () => new Map<string, (payload: Record<string, unknown>) => void>()
);
const socket = vi.hoisted(() => ({
  on: vi.fn((event: string, handler: (payload: Record<string, unknown>) => void) => {
    socketHandlers.set(event, handler);
  }),
  off: vi.fn(),
}));

vi.mock('src/lib/socket', () => ({ getSocket: vi.fn(() => socket) }));

const emptyResponse: AnomalyListResponse = {
  page: 1,
  pageSize: 20,
  total: 0,
  items: [],
};

function wrapper(initialEntry = '/alert/anomalies') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>;
  };
}

describe('useAnomalyMonitorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketHandlers.clear();
    vi.mocked(alertApi.getAnomalies).mockResolvedValue(emptyResponse);
  });

  it('从 URL 恢复合法筛选并映射为后端 Body', async () => {
    renderHook(() => useAnomalyMonitorState(), {
      wrapper: wrapper(
        '/alert/anomalies?tradeDate=2026-08-12&types=VOLUME_SURGE,LARGE_NET_INFLOW&keyword=%20%E5%B9%B3%E5%AE%89%20&scope=WATCHLIST&isNewOnly=1&multiTypeOnly=1&sortBy=value&sortOrder=asc&page=2&pageSize=50'
      ),
    });

    await waitFor(() => {
      expect(alertApi.getAnomalies).toHaveBeenLastCalledWith(
        {
          tradeDate: '20260812',
          types: ['VOLUME_SURGE', 'LARGE_NET_INFLOW'],
          keyword: '平安',
          scope: 'WATCHLIST',
          isNewOnly: true,
          multiTypeOnly: true,
          sortBy: 'value',
          sortOrder: 'asc',
          page: 3,
          pageSize: 50,
        },
        expect.any(AbortSignal)
      );
    });
  });

  it('筛选变化重置页码；单类型同时兼容 type/types 字段', async () => {
    const { result } = renderHook(() => useAnomalyMonitorState(), {
      wrapper: wrapper('/alert/anomalies?page=3'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter({ types: ['CONSECUTIVE_LIMIT_UP'], pageIndex: 9 });
    });

    await waitFor(() => {
      expect(result.current.filter.pageIndex).toBe(0);
      expect(alertApi.getAnomalies).toHaveBeenLastCalledWith(
        expect.objectContaining({
          type: 'CONSECUTIVE_LIMIT_UP',
          types: ['CONSECUTIVE_LIMIT_UP'],
          page: 1,
        }),
        expect.any(AbortSignal)
      );
    });
  });

  it('请求失败保留错误；refetch 可恢复为空结果', async () => {
    vi.mocked(alertApi.getAnomalies)
      .mockRejectedValueOnce(new Error('异动服务超时'))
      .mockResolvedValueOnce(emptyResponse);
    const { result } = renderHook(() => useAnomalyMonitorState(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).toBe('异动服务超时'));
    act(() => result.current.refetch());

    await waitFor(() => {
      expect(alertApi.getAnomalies).toHaveBeenCalledTimes(2);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('');
      expect(result.current.data).toEqual(emptyResponse);
    });
  });

  it('WebSocket 扫描完成/失败产生反馈并自动刷新，卸载时解绑', async () => {
    const { result, unmount } = renderHook(() => useAnomalyMonitorState(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getSocket).toHaveBeenCalledTimes(1);

    act(() => {
      socketHandlers.get('market-anomaly-scan-completed')?.({
        tradeDate: '20260812',
        totalNew: 3,
      });
    });
    await waitFor(() => expect(alertApi.getAnomalies).toHaveBeenCalledTimes(2));
    expect(result.current.scanFeedback).toMatchObject({
      open: true,
      severity: 'success',
      message: '扫描完成（2026-08-12），新增 3 条异动',
    });

    act(() => {
      result.current.dismissScanFeedback();
      socketHandlers.get('market-anomaly-scan-completed')?.({ errorSummary: '行情源断开' });
    });
    expect(result.current.scanFeedback).toMatchObject({
      open: true,
      severity: 'error',
      message: '异动扫描失败：行情源断开',
    });

    unmount();
    expect(socket.off).toHaveBeenCalledWith(
      'market-anomaly-scan-completed',
      expect.any(Function)
    );
  });
});
