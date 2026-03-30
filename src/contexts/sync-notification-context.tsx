import type { Socket } from 'socket.io-client';

import { useRef, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { getSocket, destroySocket } from 'src/lib/socket';

// ----------------------------------------------------------------------
// WebSocket 推送的同步事件类型定义
// 对应后端 events.gateway.ts 的广播事件
// ----------------------------------------------------------------------

export type SyncStartedPayload = {
  trigger: string;
  mode: string;
};

export type SyncCompletedPayload = {
  trigger: string;
  mode: string;
  executedTasks: string[];
  skippedTasks: string[];
  failedTasks: string[];
  targetTradeDate: string | null;
  elapsedSeconds: number;
};

export type SyncFailedPayload = {
  trigger: string;
  mode: string;
  reason: string;
};

// 通知列表条目类型，与 NotificationsPopover 保持一致
export type SyncNotificationItem = {
  id: string;
  type: 'tushare-sync-completed' | 'tushare-sync-failed';
  title: string;
  description: string;
  avatarUrl: string | null;
  isUnRead: boolean;
  postedAt: number;
  payload: SyncCompletedPayload | SyncFailedPayload;
};

// ----------------------------------------------------------------------

type SyncNotificationContextValue = {
  /** 当前是否有同步正在进行（通过 WebSocket started/completed/failed 维护） */
  isSyncing: boolean;
  /** 最新同步完成的结果（null 表示尚无结果） */
  lastSyncResult: SyncCompletedPayload | null;
  /** 最新同步失败原因（null 表示尚无错误） */
  lastSyncError: SyncFailedPayload | null;
  /** 所有同步通知列表（最新在最前） */
  notifications: SyncNotificationItem[];
  /** 将某条通知标记为已读 */
  markNotificationRead: (id: string) => void;
  /** 全部标记为已读 */
  markAllRead: () => void;
  /** 清除最新同步结果（用于关闭结果 Alert 后复位） */
  clearLastResult: () => void;
};

// ----------------------------------------------------------------------

const SyncNotificationContext = createContext<SyncNotificationContextValue | null>(null);

export function useSyncNotification(): SyncNotificationContextValue {
  const ctx = useContext(SyncNotificationContext);
  if (!ctx) throw new Error('useSyncNotification 必须在 SyncNotificationProvider 内部使用');
  return ctx;
}

// ----------------------------------------------------------------------

// 最多保留的通知条数
const MAX_NOTIFICATIONS = 50;

let _notifCounter = 0;

function generateId(): string {
  _notifCounter += 1;
  return `sync-notif-${Date.now()}-${_notifCounter}`;
}

// ----------------------------------------------------------------------

type ProviderProps = {
  children: React.ReactNode;
};

export function SyncNotificationProvider({ children }: ProviderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncCompletedPayload | null>(null);
  const [lastSyncError, setLastSyncError] = useState<SyncFailedPayload | null>(null);
  const [notifications, setNotifications] = useState<SyncNotificationItem[]>([]);

  // 保存 socket 引用，避免重复订阅
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.connect();

    const handleStarted = (_payload: SyncStartedPayload) => {
      setIsSyncing(true);
      setLastSyncResult(null);
      setLastSyncError(null);
    };

    const handleCompleted = (payload: SyncCompletedPayload) => {
      setIsSyncing(false);
      setLastSyncResult(payload);

      const hasFailed = payload.failedTasks.length > 0;
      const failedPart = hasFailed ? `，失败 ${payload.failedTasks.length} 个` : '';
      const description =
        `耗时 ${payload.elapsedSeconds.toFixed(1)} 秒，` +
        `成功 ${payload.executedTasks.length} 个，` +
        `跳过 ${payload.skippedTasks.length} 个` +
        failedPart;

      const item: SyncNotificationItem = {
        id: generateId(),
        type: 'tushare-sync-completed',
        title: hasFailed ? '数据同步完成（有失败任务）' : '数据同步成功',
        description,
        avatarUrl: null,
        isUnRead: true,
        postedAt: Date.now(),
        payload,
      };

      setNotifications((prev) => [item, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);
    };

    const handleFailed = (payload: SyncFailedPayload) => {
      setIsSyncing(false);
      setLastSyncError(payload);

      const item: SyncNotificationItem = {
        id: generateId(),
        type: 'tushare-sync-failed',
        title: '数据同步异常',
        description: payload.reason,
        avatarUrl: null,
        isUnRead: true,
        postedAt: Date.now(),
        payload,
      };

      setNotifications((prev) => [item, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);
    };

    socket.on('tushare_sync_started', handleStarted);
    socket.on('tushare_sync_completed', handleCompleted);
    socket.on('tushare_sync_failed', handleFailed);

    return () => {
      socket.off('tushare_sync_started', handleStarted);
      socket.off('tushare_sync_completed', handleCompleted);
      socket.off('tushare_sync_failed', handleFailed);
      destroySocket();
    };
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnRead: false } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnRead: false })));
  }, []);

  const clearLastResult = useCallback(() => {
    setLastSyncResult(null);
    setLastSyncError(null);
  }, []);

  return (
    <SyncNotificationContext.Provider
      value={{
        isSyncing,
        lastSyncResult,
        lastSyncError,
        notifications,
        markNotificationRead,
        markAllRead,
        clearLastResult,
      }}
    >
      {children}
    </SyncNotificationContext.Provider>
  );
}
