import { act, renderHook } from '@testing-library/react';

import {
  useSyncNotification,
  SyncNotificationProvider,
} from 'src/contexts/sync-notification-context';
import {
  createSyncFailedPayload,
  createSyncStartedPayload,
  createRiskViolationPayload,
  createSyncCompletedPayload,
} from 'src/test/factories/sync-events';

// ----------------------------------------------------------------------
// Socket mock (vi.hoisted so the factory can reference it)
// ----------------------------------------------------------------------

const { mockGetSocket, mockDestroySocket, mockGetSocketStatus, mockOnSocketStatusChange } = vi.hoisted(() => ({
  mockGetSocket: vi.fn(),
  mockDestroySocket: vi.fn(),
  mockGetSocketStatus: vi.fn(() => 'disconnected'),
  mockOnSocketStatusChange: vi.fn(() => vi.fn()),
}));

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(() => ({ isAuthenticated: true })),
}));

vi.mock('src/lib/socket', () => ({
  getSocket: mockGetSocket,
  destroySocket: mockDestroySocket,
  getSocketStatus: mockGetSocketStatus,
  onSocketStatusChange: mockOnSocketStatusChange,
}));

vi.mock('src/auth', () => ({ useAuth: mockUseAuth }));

// ----------------------------------------------------------------------

type MockSocket = {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
};

let mockSocket: MockSocket;

/** 从 socket.on 的调用记录中查找并调用某事件的处理器 */
function emitSocket(event: string, payload?: unknown) {
  const calls = mockSocket.on.mock.calls as [string, (...args: unknown[]) => void][];
  const handler = calls.find(([evt]) => evt === event)?.[1];
  handler?.(payload);
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <SyncNotificationProvider>{children}</SyncNotificationProvider>;
}

// ----------------------------------------------------------------------

beforeEach(() => {
  mockSocket = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
  mockGetSocket.mockReturnValue(mockSocket);
  mockDestroySocket.mockReset();
  mockUseAuth.mockReturnValue({ isAuthenticated: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ----------------------------------------------------------------------

describe('SyncNotificationProvider', () => {
  describe('Socket 生命周期', () => {
    it('mount 时调用 getSocket() 并执行 socket.connect()', () => {
      renderHook(useSyncNotification, { wrapper });

      expect(mockGetSocket).toHaveBeenCalled();
      expect(mockSocket.connect).toHaveBeenCalledTimes(1);
    });

    it('未认证时不创建连接并销毁旧 socket', () => {
      mockUseAuth.mockReturnValue({ isAuthenticated: false });

      renderHook(useSyncNotification, { wrapper });

      expect(mockGetSocket).not.toHaveBeenCalled();
      expect(mockDestroySocket).toHaveBeenCalledTimes(1);
    });

    it('mount 时注册全部 10 个事件监听器', () => {
      renderHook(useSyncNotification, { wrapper });

      expect(mockSocket.on).toHaveBeenCalledTimes(10);

      const registeredEvents = (mockSocket.on.mock.calls as [string, ...unknown[]][]).map(
        ([event]) => event
      );
      expect(registeredEvents).toContain('tushare_sync_started');
      expect(registeredEvents).toContain('tushare_sync_completed');
      expect(registeredEvents).toContain('tushare_sync_failed');
      expect(registeredEvents).toContain('tushare_sync_progress');
      expect(registeredEvents).toContain('tushare_sync_overall_progress');
      expect(registeredEvents).toContain('data_quality_completed');
      expect(registeredEvents).toContain('auto_repair_queued');
      expect(registeredEvents).toContain('risk_violation');
      expect(registeredEvents).toContain('screener_subscription_alert');
      expect(registeredEvents).toContain('agent_run_updated');
    });

    it('unmount 时移除全部事件监听器并调用 destroySocket()', () => {
      const { unmount } = renderHook(useSyncNotification, { wrapper });

      unmount();

      expect(mockSocket.off).toHaveBeenCalledTimes(10);
      expect(mockDestroySocket).toHaveBeenCalledTimes(1);
    });
  });

  describe('同步状态 — tushare_sync_started', () => {
    it('收到 started 事件后 isSyncing 变为 true', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_started', createSyncStartedPayload());
      });

      expect(result.current.isSyncing).toBe(true);
    });

    it('started 与进度事件合并为当前运行态快照', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_started', createSyncStartedPayload({ runId: 'run-1' }));
        emitSocket('tushare_sync_progress', {
          runId: 'run-1',
          task: 'DAILY',
          label: '日线行情',
          category: 'market',
          completedItems: 4,
          totalItems: 10,
          percentage: 40,
          elapsedMs: 1000,
        });
        emitSocket('tushare_sync_overall_progress', {
          runId: 'run-1',
          completedTasks: 2,
          totalTasks: 5,
          percentage: 40,
          elapsedMs: 2000,
          estimatedRemainingMs: 3000,
        });
      });

      expect(result.current.runtimeSnapshot).toMatchObject({
        status: 'RUNNING',
        runId: 'run-1',
        completedTasks: 2,
        totalTasks: 5,
        percentage: 40,
        activeTasks: [expect.objectContaining({ task: 'DAILY', percentage: 40 })],
      });
    });

    it('started 事件清除上次的 lastSyncResult 和 lastSyncError', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      // First set a result via completed
      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
      });
      expect(result.current.lastSyncResult).not.toBeNull();

      // Then started clears it
      act(() => {
        emitSocket('tushare_sync_started', createSyncStartedPayload());
      });

      expect(result.current.lastSyncResult).toBeNull();
      expect(result.current.lastSyncError).toBeNull();
    });
  });

  describe('同步完成 — tushare_sync_completed', () => {
    it('收到 completed 后 isSyncing 变为 false', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_started', createSyncStartedPayload());
      });
      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
      });

      expect(result.current.isSyncing).toBe(false);
    });

    it('设置 lastSyncResult 为 completed payload', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });
      const payload = createSyncCompletedPayload();

      act(() => {
        emitSocket('tushare_sync_completed', payload);
      });

      expect(result.current.lastSyncResult).toEqual(payload);
    });

    it('生成一条 type=tushare-sync-completed 的通知', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].type).toBe('tushare-sync-completed');
    });

    it('通知标题：无失败任务 → "数据同步成功"', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload({ failedTasks: [] }));
      });

      expect(result.current.notifications[0].title).toBe('数据同步成功');
    });

    it('通知标题：有失败任务 → "数据同步完成（有失败任务）"', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket(
          'tushare_sync_completed',
          createSyncCompletedPayload({ failedTasks: ['index_daily'] })
        );
      });

      expect(result.current.notifications[0].title).toBe('数据同步完成（有失败任务）');
    });

    it('通知描述包含耗时和任务计数', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket(
          'tushare_sync_completed',
          createSyncCompletedPayload({
            executedTasks: ['daily_basic', 'money_flow'],
            skippedTasks: ['adj_factor'],
            elapsedSeconds: 12.5,
          })
        );
      });

      const { description } = result.current.notifications[0];
      expect(description).toContain('12.5 秒');
      expect(description).toContain('成功 2 个');
      expect(description).toContain('跳过 1 个');
    });
  });

  describe('同步失败 — tushare_sync_failed', () => {
    it('收到 failed 后 isSyncing 变为 false', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_started', createSyncStartedPayload());
      });
      act(() => {
        emitSocket('tushare_sync_failed', createSyncFailedPayload());
      });

      expect(result.current.isSyncing).toBe(false);
    });

    it('设置 lastSyncError 为 failed payload', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });
      const payload = createSyncFailedPayload();

      act(() => {
        emitSocket('tushare_sync_failed', payload);
      });

      expect(result.current.lastSyncError).toEqual(payload);
    });

    it('生成一条 type=tushare-sync-failed 的通知，标题为"数据同步异常"', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });
      const payload = createSyncFailedPayload({ reason: 'Tushare API 超时' });

      act(() => {
        emitSocket('tushare_sync_failed', payload);
      });

      const notif = result.current.notifications[0];
      expect(notif.type).toBe('tushare-sync-failed');
      expect(notif.title).toBe('数据同步异常');
      expect(notif.description).toBe('Tushare API 超时');
    });
  });

  describe('风控违规 — risk_violation', () => {
    it('生成一条 type=risk-violation 的通知', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('risk_violation', createRiskViolationPayload());
      });

      expect(result.current.notifications[0].type).toBe('risk-violation');
    });

    it('通知标题包含组合名称和违规条数', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('risk_violation', createRiskViolationPayload());
      });

      const { title } = result.current.notifications[0];
      expect(title).toContain('测试组合');
      expect(title).toContain('1 条');
    });

    it('≤3 条违规的描述直接展示 message', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket(
          'risk_violation',
          createRiskViolationPayload({
            violations: [
              {
                ruleType: 'MAX_POSITION_RATIO',
                tsCode: '000001.SZ',
                stockName: '平安银行',
                currentValue: 35,
                threshold: 30,
                message: '单个违规消息',
              },
            ],
          })
        );
      });

      expect(result.current.notifications[0].description).toBe('单个违规消息');
    });

    it('>3 条违规的描述包含截断提示', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket(
          'risk_violation',
          createRiskViolationPayload({
            violations: Array.from({ length: 4 }, (_, i) => ({
              ruleType: 'MAX_POSITION_RATIO',
              tsCode: null,
              stockName: null,
              currentValue: i + 1,
              threshold: 10,
              message: `违规 ${i + 1}`,
            })),
          })
        );
      });

      expect(result.current.notifications[0].description).toContain('…等 4 条');
    });

    it('风控事件不影响 isSyncing 状态', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('risk_violation', createRiskViolationPayload());
      });

      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('数据质量 — data_quality_completed', () => {
    it('收到事件后更新 lastQualitySummary', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      const mockSummary = {
        checkedAt: '2026-04-13T10:00:00Z',
        totalDataSets: 10,
        counts: { pass: 8, warn: 1, fail: 1 },
        failures: [],
        crossTableCounts: { pass: 5, warn: 0, fail: 0 },
        autoRepairTriggered: false,
        repairTaskCount: 0,
      };

      act(() => {
        emitSocket('data_quality_completed', mockSummary);
      });

      expect(result.current.lastQualitySummary).toEqual(mockSummary);
    });
  });

  describe('Agent Run 失效通知', () => {
    it('只保存轻量更新，供 Agent 页面重新读取权威状态', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });
      const payload = {
        runId: 'run_1',
        status: 'RUNNING' as const,
        lastSequence: 12,
        updatedAt: '2026-07-20T01:00:00.000Z',
      };

      act(() => {
        emitSocket('agent_run_updated', payload);
      });

      expect(result.current.lastAgentRunUpdate).toEqual(payload);
    });
  });

  describe('通知列表管理', () => {
    it('新通知插入到列表最前面', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload({ elapsedSeconds: 1 }));
      });
      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload({ elapsedSeconds: 2 }));
      });

      expect(result.current.notifications[0].description).toContain('2.0 秒');
    });

    it('通知列表最多保留 50 条（FIFO 淘汰最旧的）', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        for (let i = 0; i < 51; i += 1) {
          emitSocket('tushare_sync_completed', createSyncCompletedPayload({ elapsedSeconds: i }));
        }
      });

      expect(result.current.notifications).toHaveLength(50);
    });

    it('每条通知有唯一 ID', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
        emitSocket('tushare_sync_failed', createSyncFailedPayload());
      });

      const ids = result.current.notifications.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('新通知默认 isUnRead=true', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
      });

      expect(result.current.notifications[0].isUnRead).toBe(true);
    });

    it('markNotificationRead 标记单条为已读', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
      });

      const { id } = result.current.notifications[0];

      act(() => {
        result.current.markNotificationRead(id);
      });

      expect(result.current.notifications[0].isUnRead).toBe(false);
    });

    it('markNotificationRead 不影响其他通知', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
        emitSocket('tushare_sync_failed', createSyncFailedPayload());
      });

      // notifications[0] is the most recent (failed), notifications[1] is completed
      const firstId = result.current.notifications[0].id;

      act(() => {
        result.current.markNotificationRead(firstId);
      });

      expect(result.current.notifications[0].isUnRead).toBe(false);
      expect(result.current.notifications[1].isUnRead).toBe(true);
    });

    it('markAllRead 将全部通知标记为已读', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
        emitSocket('tushare_sync_failed', createSyncFailedPayload());
        emitSocket('risk_violation', createRiskViolationPayload());
      });

      act(() => {
        result.current.markAllRead();
      });

      expect(result.current.notifications.every((n) => !n.isUnRead)).toBe(true);
    });
  });

  describe('clearLastResult', () => {
    it('清除 lastSyncResult 和 lastSyncError', () => {
      const { result } = renderHook(useSyncNotification, { wrapper });

      act(() => {
        emitSocket('tushare_sync_completed', createSyncCompletedPayload());
      });
      expect(result.current.lastSyncResult).not.toBeNull();

      act(() => {
        result.current.clearLastResult();
      });

      expect(result.current.lastSyncResult).toBeNull();
      expect(result.current.lastSyncError).toBeNull();
    });
  });

  describe('useSyncNotification hook', () => {
    it('在 Provider 外部调用时抛出错误', () => {
      expect(() => renderHook(useSyncNotification)).toThrow(
        'useSyncNotification 必须在 SyncNotificationProvider 内部使用'
      );
    });
  });
});
