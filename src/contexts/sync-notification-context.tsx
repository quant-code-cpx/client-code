import type { Socket } from 'socket.io-client';
import type { SocketStatus } from 'src/lib/socket';
import type { ViolationItem } from 'src/api/portfolio';
import type { RepairSummary, QualityCheckSummary } from 'src/api/tushare-sync';

import { useRef, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { getSocket, destroySocket, getSocketStatus, onSocketStatusChange } from 'src/lib/socket';

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

// 风控违规推送
export type RiskViolationPayload = {
  portfolioId: string;
  portfolioName: string;
  violations: ViolationItem[];
  checkedAt: string;
};

// 条件订阅命中推送
export type ScreenerSubscriptionAlertPayload = {
  subscriptionId: number;
  subscriptionName?: string;
  tradeDate?: string;
  newEntryCodes?: string[];
  exitCodes?: string[];
  totalMatch?: number;
};

// 通知列表条目类型，与 NotificationsPopover 保持一致
export type SyncNotificationItem = {
  id: string;
  type:
    | 'tushare-sync-completed'
    | 'tushare-sync-failed'
    | 'risk-violation'
    | 'screener-subscription-alert';
  title: string;
  description: string;
  avatarUrl: string | null;
  isUnRead: boolean;
  postedAt: number;
  payload:
    | SyncCompletedPayload
    | SyncFailedPayload
    | RiskViolationPayload
    | ScreenerSubscriptionAlertPayload;
};

// ----------------------------------------------------------------------

type SyncNotificationContextValue = {
  /** 当前 WebSocket 连接状态 */
  socketStatus: SocketStatus;
  /** WebSocket 是否在线 */
  isConnected: boolean;
  /** 主动发起重连 */
  reconnect: () => void;
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
  /** Phase 4: 最新一轮数据质量检查摘要（WebSocket 推送或手动触发时更新） */
  lastQualitySummary: QualityCheckSummary | null;
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
// NOTE: 重连时 socket.ts 的 replay 机制会重新触发已缓存的事件，
// 这些 replayed 事件会经由相同的 handler 正常处理，确保状态一致。
// 由于每条通知使用 generateId() 生成唯一 id，replay 不会产生重复通知。
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
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(getSocketStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncCompletedPayload | null>(null);
  const [lastSyncError, setLastSyncError] = useState<SyncFailedPayload | null>(null);
  const [notifications, setNotifications] = useState<SyncNotificationItem[]>([]);
  const [lastQualitySummary, setLastQualitySummary] = useState<QualityCheckSummary | null>(null);

  // 保存 socket 引用，避免重复订阅
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.connect();
    setSocketStatus(getSocketStatus());
    const offStatus = onSocketStatusChange(setSocketStatus);

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

    // ── Phase 4 新增事件 ──
    const handleQualityCompleted = (summary: QualityCheckSummary) => {
      setLastQualitySummary(summary);
    };

    const handleAutoRepairQueued = (_repair: RepairSummary) => {
      // payload 由消费侧 DataQualityTab 使用，此处仅做存储触发
    };

    socket.on('data_quality_completed', handleQualityCompleted);
    socket.on('auto_repair_queued', handleAutoRepairQueued);

    // ── 风控违规推送 ──
    const handleRiskViolation = (payload: RiskViolationPayload) => {
      const count = payload.violations.length;
      const desc = payload.violations
        .slice(0, 3)
        .map((v) => v.message)
        .join('；');

      const item: SyncNotificationItem = {
        id: generateId(),
        type: 'risk-violation',
        title: `组合「${payload.portfolioName}」触发 ${count} 条风控违规`,
        description: count > 3 ? `${desc}…等 ${count} 条` : desc,
        avatarUrl: null,
        isUnRead: true,
        postedAt: Date.now(),
        payload,
      };

      setNotifications((prev) => [item, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);
    };

    socket.on('risk_violation', handleRiskViolation);

    // ── 条件订阅命中推送（全局通知） ──
    const handleScreenerSubscriptionAlert = (payload: ScreenerSubscriptionAlertPayload) => {
      const newCount = payload.newEntryCodes?.length ?? 0;
      const exitCount = payload.exitCodes?.length ?? 0;
      const subName = payload.subscriptionName ?? `订阅 #${payload.subscriptionId}`;
      const desc =
        `${payload.tradeDate ? `${payload.tradeDate} ` : ''}` +
        `命中 ${payload.totalMatch ?? 0} 只，` +
        `新增 ${newCount} 只` +
        (exitCount > 0 ? `，退出 ${exitCount} 只` : '');

      const item: SyncNotificationItem = {
        id: generateId(),
        type: 'screener-subscription-alert',
        title: `条件订阅「${subName}」有新进入股票`,
        description: desc,
        avatarUrl: null,
        isUnRead: true,
        postedAt: Date.now(),
        payload,
      };

      setNotifications((prev) => [item, ...prev.slice(0, MAX_NOTIFICATIONS - 1)]);
    };

    socket.on('screener_subscription_alert', handleScreenerSubscriptionAlert);

    return () => {
      socket.off('tushare_sync_started', handleStarted);
      socket.off('tushare_sync_completed', handleCompleted);
      socket.off('tushare_sync_failed', handleFailed);
      socket.off('data_quality_completed', handleQualityCompleted);
      socket.off('auto_repair_queued', handleAutoRepairQueued);
      socket.off('risk_violation', handleRiskViolation);
      socket.off('screener_subscription_alert', handleScreenerSubscriptionAlert);
      offStatus();
      destroySocket();
    };
  }, []);

  const reconnect = useCallback(() => {
    const socket = socketRef.current ?? getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isUnRead: false } : n)));
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
        socketStatus,
        isConnected: socketStatus === 'connected',
        reconnect,
        isSyncing,
        lastSyncResult,
        lastSyncError,
        notifications,
        markNotificationRead,
        markAllRead,
        clearLastResult,
        lastQualitySummary,
      }}
    >
      {children}
    </SyncNotificationContext.Provider>
  );
}
