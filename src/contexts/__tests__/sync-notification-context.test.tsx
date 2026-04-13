import { renderHook, act, waitFor } from '@testing-library/react';

import { SyncNotificationProvider, useSyncNotification } from '../sync-notification-context';

import type { SyncCompletedPayload, SyncFailedPayload, SyncStartedPayload } from '../sync-notification-context';

// ----------------------------------------------------------------------
// Mock socket.io-client singleton
// ----------------------------------------------------------------------

// We create a mock EventEmitter that simulates socket.on/off/emit/connect
type EventHandler = (...args: unknown[]) => void;

let _mockListeners: Record<string, EventHandler[]> = {};

const mockSocket = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  on(event: string, handler: EventHandler) {
    if (!_mockListeners[event]) {
      _mockListeners[event] = [];
    }
    _mockListeners[event].push(handler);
  },
  off(event: string, handler: EventHandler) {
    if (_mockListeners[event]) {
      _mockListeners[event] = _mockListeners[event].filter((h) => h !== handler);
    }
  },
  emit(event: string, ...args: unknown[]) {
    (_mockListeners[event] ?? []).forEach((h) => h(...args));
  },
};

vi.mock('src/lib/socket', () => ({
  getSocket: () => mockSocket,
  destroySocket: vi.fn(),
}));

// ----------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return <SyncNotificationProvider>{children}</SyncNotificationProvider>;
}

function emit(event: string, payload?: unknown) {
  mockSocket.emit(event, payload);
}

beforeEach(() => {
  _mockListeners = {};
  mockSocket.connect.mockClear();
  mockSocket.disconnect.mockClear();
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — initial state', () => {
  it('starts with isSyncing=false, empty notifications', () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.lastSyncResult).toBeNull();
    expect(result.current.lastSyncError).toBeNull();
  });

  it('calls socket.connect() on mount', () => {
    renderHook(() => useSyncNotification(), { wrapper });
    expect(mockSocket.connect).toHaveBeenCalledTimes(1);
  });
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — tushare_sync_started', () => {
  it('sets isSyncing=true and clears previous results', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    const startedPayload: SyncStartedPayload = { trigger: 'manual', mode: 'full' };

    act(() => {
      emit('tushare_sync_started', startedPayload);
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(true);
    });

    expect(result.current.lastSyncResult).toBeNull();
    expect(result.current.lastSyncError).toBeNull();
  });
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — tushare_sync_completed', () => {
  const completedPayload: SyncCompletedPayload = {
    trigger: 'manual',
    mode: 'full',
    executedTasks: ['task-a', 'task-b'],
    skippedTasks: ['task-c'],
    failedTasks: [],
    targetTradeDate: '20250101',
    elapsedSeconds: 3.5,
  };

  it('sets isSyncing=false and stores lastSyncResult', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_completed', completedPayload);
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    expect(result.current.lastSyncResult).toEqual(completedPayload);
  });

  it('adds a notification item to the list', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_completed', completedPayload);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    const notif = result.current.notifications[0];
    expect(notif.type).toBe('tushare-sync-completed');
    expect(notif.isUnRead).toBe(true);
    expect(notif.title).toBe('数据同步成功');
  });

  it('uses "有失败任务" title when failedTasks is non-empty', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_completed', { ...completedPayload, failedTasks: ['task-x'] });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    expect(result.current.notifications[0].title).toContain('有失败任务');
  });

  it('description contains elapsed seconds and task counts', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_completed', completedPayload);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    const { description } = result.current.notifications[0];
    expect(description).toContain('3.5 秒');
    expect(description).toContain('成功 2');
    expect(description).toContain('跳过 1');
  });

  it('most recent notification appears at index 0', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_completed', completedPayload);
      emit('tushare_sync_completed', { ...completedPayload, elapsedSeconds: 7.0 });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    expect(result.current.notifications[0].description).toContain('7.0 秒');
  });
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — tushare_sync_failed', () => {
  const failedPayload: SyncFailedPayload = {
    trigger: 'cron',
    mode: 'incremental',
    reason: 'Connection timeout',
  };

  it('sets isSyncing=false and stores lastSyncError', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_failed', failedPayload);
    });

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });

    expect(result.current.lastSyncError).toEqual(failedPayload);
  });

  it('adds a "tushare-sync-failed" notification', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_failed', failedPayload);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    const notif = result.current.notifications[0];
    expect(notif.type).toBe('tushare-sync-failed');
    expect(notif.title).toBe('数据同步异常');
    expect(notif.description).toBe('Connection timeout');
    expect(notif.isUnRead).toBe(true);
  });
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — MAX_NOTIFICATIONS cap (50)', () => {
  it('caps notification list at 50 items', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    const payload: SyncCompletedPayload = {
      trigger: 'manual',
      mode: 'full',
      executedTasks: [],
      skippedTasks: [],
      failedTasks: [],
      targetTradeDate: null,
      elapsedSeconds: 1,
    };

    // Emit 60 events
    act(() => {
      for (let i = 0; i < 60; i += 1) {
        emit('tushare_sync_completed', payload);
      }
    });

    await waitFor(() => {
      expect(result.current.notifications.length).toBeLessThanOrEqual(50);
    });

    expect(result.current.notifications).toHaveLength(50);
  });
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — markNotificationRead', () => {
  it('marks a specific notification as read', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    const payload: SyncCompletedPayload = {
      trigger: 'manual',
      mode: 'full',
      executedTasks: [],
      skippedTasks: [],
      failedTasks: [],
      targetTradeDate: null,
      elapsedSeconds: 1,
    };

    act(() => {
      emit('tushare_sync_completed', payload);
      emit('tushare_sync_completed', payload);
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    const targetId = result.current.notifications[0].id;

    act(() => {
      result.current.markNotificationRead(targetId);
    });

    expect(result.current.notifications[0].isUnRead).toBe(false);
    // Second notification remains unread
    expect(result.current.notifications[1].isUnRead).toBe(true);
  });

  it('does not affect notifications with different ids', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_failed', { trigger: 'cron', mode: 'full', reason: 'err' });
      emit('tushare_sync_failed', { trigger: 'cron', mode: 'full', reason: 'err2' });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    act(() => {
      result.current.markNotificationRead(result.current.notifications[0].id);
    });

    // Only first is read
    expect(result.current.notifications[0].isUnRead).toBe(false);
    expect(result.current.notifications[1].isUnRead).toBe(true);
  });
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — markAllRead', () => {
  it('marks all notifications as read', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_completed', {
        trigger: 'manual', mode: 'full', executedTasks: [], skippedTasks: [], failedTasks: [],
        targetTradeDate: null, elapsedSeconds: 1,
      });
      emit('tushare_sync_failed', { trigger: 'cron', mode: 'full', reason: 'err' });
    });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(2);
    });

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.notifications.every((n) => !n.isUnRead)).toBe(true);
  });

  it('works when the list is empty', () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      result.current.markAllRead();
    });

    expect(result.current.notifications).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------

describe('SyncNotificationContext — clearLastResult', () => {
  it('clears lastSyncResult', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_completed', {
        trigger: 'manual', mode: 'full', executedTasks: [], skippedTasks: [], failedTasks: [],
        targetTradeDate: null, elapsedSeconds: 1,
      });
    });

    await waitFor(() => {
      expect(result.current.lastSyncResult).not.toBeNull();
    });

    act(() => {
      result.current.clearLastResult();
    });

    expect(result.current.lastSyncResult).toBeNull();
  });

  it('clears lastSyncError', async () => {
    const { result } = renderHook(() => useSyncNotification(), { wrapper });

    act(() => {
      emit('tushare_sync_failed', { trigger: 'cron', mode: 'full', reason: 'err' });
    });

    await waitFor(() => {
      expect(result.current.lastSyncError).not.toBeNull();
    });

    act(() => {
      result.current.clearLastResult();
    });

    expect(result.current.lastSyncError).toBeNull();
  });
});
