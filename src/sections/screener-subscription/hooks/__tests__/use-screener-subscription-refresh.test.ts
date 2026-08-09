import { act, renderHook } from '@testing-library/react';

import { useScreenerSubscriptionRefresh } from '../use-screener-subscription-refresh';

// ----------------------------------------------------------------------

const { mockGetSocket } = vi.hoisted(() => ({ mockGetSocket: vi.fn() }));

vi.mock('src/lib/socket', () => ({ getSocket: mockGetSocket }));

type EventHandler = (payload: { subscriptionId: number }) => void;

const socket = {
  connect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
};

function emit(event: string, payload: { subscriptionId: number }) {
  const handler = socket.on.mock.calls.find(([name]) => name === event)?.[1] as
    | EventHandler
    | undefined;
  handler?.(payload);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSocket.mockReturnValue(socket);
});

describe('useScreenerSubscriptionRefresh', () => {
  it.each(['screener_subscription_alert', 'screener_subscription_failed'])(
    '%s 使列表页静默刷新',
    (event) => {
      const refresh = vi.fn();
      renderHook(() => useScreenerSubscriptionRefresh(refresh));

      act(() => emit(event, { subscriptionId: 8 }));

      expect(refresh).toHaveBeenCalledTimes(1);
    }
  );

  it('详情页只刷新当前订阅，失败事件与命中事件规则一致', () => {
    const refresh = vi.fn();
    renderHook(() => useScreenerSubscriptionRefresh(refresh, 7));

    act(() => {
      emit('screener_subscription_failed', { subscriptionId: 8 });
      emit('screener_subscription_failed', { subscriptionId: 7 });
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('卸载时成对移除两个监听器', () => {
    const { unmount } = renderHook(() => useScreenerSubscriptionRefresh(vi.fn()));

    unmount();

    expect(socket.off).toHaveBeenCalledTimes(2);
    expect(socket.off).toHaveBeenCalledWith(
      'screener_subscription_alert',
      expect.any(Function)
    );
    expect(socket.off).toHaveBeenCalledWith(
      'screener_subscription_failed',
      expect.any(Function)
    );
  });
});
