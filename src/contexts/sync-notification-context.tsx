import type { Socket } from 'socket.io-client';
import type { SocketStatus } from 'src/lib/socket';
import type { ViolationItem } from 'src/api/portfolio';
import type { AgentRunStatus } from 'src/types/agent/generated';
import type {
  RepairSummary,
  SyncRuntimeTask,
  QualityCheckSummary,
  SyncRuntimeSnapshot,
} from 'src/api/tushare-sync';

import { useRef, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { useAuth } from 'src/auth';
import { getSocket, destroySocket, getSocketStatus, onSocketStatusChange } from 'src/lib/socket';

// ----------------------------------------------------------------------
// WebSocket 推送的同步事件类型定义
// 对应后端 events.gateway.ts 的广播事件
// ----------------------------------------------------------------------

export type SyncStartedPayload = {
  runId?: string;
  trigger: string;
  mode: string;
};

export type SyncCompletedPayload = {
  runId?: string;
  trigger: string;
  mode: string;
  executedTasks: string[];
  skippedTasks: string[];
  failedTasks: string[];
  targetTradeDate: string | null;
  elapsedSeconds: number;
};

export type SyncFailedPayload = {
  runId?: string;
  trigger: string;
  mode: string;
  reason: string;
};

export type SyncProgressPayload = SyncRuntimeTask & { runId?: string };

export type SyncOverallProgressPayload = {
  runId?: string;
  completedTasks: number;
  totalTasks: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs?: number;
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

export type AgentRunUpdatedPayload = {
  runId: string;
  status: AgentRunStatus;
  lastSequence: number;
  updatedAt: string;
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
  /** WebSocket 增量运行态；页面刷新后的权威状态由 runtime-status REST 恢复 */
  runtimeSnapshot: SyncRuntimeSnapshot | null;
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
  /** Agent 后台/其他设备 Run 变化，只用于触发权威状态刷新 */
  lastAgentRunUpdate: AgentRunUpdatedPayload | null;
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
// Socket 只用于实时提示；重连后的权威状态由各业务 REST/SSE 请求恢复。
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
  const { isAuthenticated } = useAuth();
  const [socketStatus, setSocketStatus] = useState<SocketStatus>(getSocketStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<SyncRuntimeSnapshot | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncCompletedPayload | null>(null);
  const [lastSyncError, setLastSyncError] = useState<SyncFailedPayload | null>(null);
  const [notifications, setNotifications] = useState<SyncNotificationItem[]>([]);
  const [lastQualitySummary, setLastQualitySummary] = useState<QualityCheckSummary | null>(null);
  const [lastAgentRunUpdate, setLastAgentRunUpdate] = useState<AgentRunUpdatedPayload | null>(null);

  // 保存 socket 引用，避免重复订阅
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      destroySocket();
      socketRef.current = null;
      return undefined;
    }

    const socket = getSocket();
    socketRef.current = socket;

    socket.connect();
    setSocketStatus(getSocketStatus());
    const offStatus = onSocketStatusChange(setSocketStatus);

    const handleStarted = (payload: SyncStartedPayload) => {
      setIsSyncing(true);
      setLastSyncResult(null);
      setLastSyncError(null);
      const now = new Date().toISOString();
      setRuntimeSnapshot({
        status: 'RUNNING',
        runId: payload.runId ?? null,
        sequence: 1,
        trigger: payload.trigger,
        mode: payload.mode === 'full' ? 'full' : 'incremental',
        startedAt: now,
        updatedAt: now,
        heartbeatExpiresAt: null,
        completedTasks: 0,
        totalTasks: 0,
        percentage: 0,
        elapsedMs: 0,
        estimatedRemainingMs: null,
        activeTasks: [],
        queue: { position: 0, total: 0 },
      });
    };

    const handleCompleted = (payload: SyncCompletedPayload) => {
      setIsSyncing(false);
      setRuntimeSnapshot(null);
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
      setRuntimeSnapshot(null);
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

    const handleProgress = (payload: SyncProgressPayload) => {
      setRuntimeSnapshot((current) => {
        if (!current || (payload.runId && current.runId && payload.runId !== current.runId)) return current;
        return {
          ...current,
          sequence: current.sequence + 1,
          updatedAt: new Date().toISOString(),
          activeTasks: [...current.activeTasks.filter((item) => item.task !== payload.task), payload],
        };
      });
    };

    const handleOverallProgress = (payload: SyncOverallProgressPayload) => {
      setRuntimeSnapshot((current) => {
        if (!current || (payload.runId && current.runId && payload.runId !== current.runId)) return current;
        return {
          ...current,
          sequence: current.sequence + 1,
          updatedAt: new Date().toISOString(),
          completedTasks: payload.completedTasks,
          totalTasks: payload.totalTasks,
          percentage: payload.percentage,
          elapsedMs: payload.elapsedMs,
          estimatedRemainingMs: payload.estimatedRemainingMs ?? null,
        };
      });
    };

    socket.on('tushare_sync_started', handleStarted);
    socket.on('tushare_sync_completed', handleCompleted);
    socket.on('tushare_sync_failed', handleFailed);
    socket.on('tushare_sync_progress', handleProgress);
    socket.on('tushare_sync_overall_progress', handleOverallProgress);

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

    const handleAgentRunUpdated = (payload: AgentRunUpdatedPayload) => {
      setLastAgentRunUpdate(payload);
    };

    socket.on('agent_run_updated', handleAgentRunUpdated);

    return () => {
      socket.off('tushare_sync_started', handleStarted);
      socket.off('tushare_sync_completed', handleCompleted);
      socket.off('tushare_sync_failed', handleFailed);
      socket.off('tushare_sync_progress', handleProgress);
      socket.off('tushare_sync_overall_progress', handleOverallProgress);
      socket.off('data_quality_completed', handleQualityCompleted);
      socket.off('auto_repair_queued', handleAutoRepairQueued);
      socket.off('risk_violation', handleRiskViolation);
      socket.off('screener_subscription_alert', handleScreenerSubscriptionAlert);
      socket.off('agent_run_updated', handleAgentRunUpdated);
      offStatus();
      destroySocket();
    };
  }, [isAuthenticated]);

  const reconnect = useCallback(() => {
    if (!isAuthenticated) return;
    const socket = socketRef.current ?? getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();
  }, [isAuthenticated]);

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
        runtimeSnapshot,
        lastSyncResult,
        lastSyncError,
        notifications,
        markNotificationRead,
        markAllRead,
        clearLastResult,
        lastQualitySummary,
        lastAgentRunUpdate,
      }}
    >
      {children}
    </SyncNotificationContext.Provider>
  );
}
