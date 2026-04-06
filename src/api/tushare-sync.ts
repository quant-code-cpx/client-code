import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义（对应后端 tushare-admin 接口）
// ----------------------------------------------------------------------

export type TushareSyncMode = 'incremental' | 'full';

export type TushareSyncCategory =
  | 'basic'
  | 'market'
  | 'financial'
  | 'moneyflow'
  | 'factor'
  | 'alternative';

export type TushareSyncStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type TushareSyncRetryStatus = 'PENDING' | 'RETRYING' | 'SUCCEEDED' | 'EXHAUSTED';

export type TushareSyncSchedule = {
  cron: string;
  timeZone: string;
  /** 人类可读的定时描述，如"交易日盘后同步" */
  description: string;
  tradingDayOnly: boolean;
};

/** 单个同步任务计划 */
export type TushareSyncPlan = {
  task: string;
  label: string;
  category: TushareSyncCategory;
  bootstrapEnabled: boolean;
  supportsManual: boolean;
  supportsFullSync: boolean;
  requiresTradeDate: boolean;
  schedule: TushareSyncSchedule | null;
};

/**
 * 手动同步触发响应（202 Accepted）
 * 实际同步结果通过 WebSocket 事件 tushare_sync_completed / tushare_sync_failed 返回
 */
export type ManualSyncAccepted = {
  message: string;
};

// ── 缓存统计 ──

export type CacheNamespaceMetrics = {
  namespace: string;
  keyCount: number;
  hits: number;
  misses: number;
  writes: number;
  invalidations: number;
  hitRate: number | null;
  lastHitAt: string | null;
  lastMissAt: string | null;
  lastWriteAt: string | null;
  lastInvalidatedAt: string | null;
};

export type CacheMetricsData = {
  generatedAt: string;
  namespaces: CacheNamespaceMetrics[];
};

// ── 同步日志 ──

export type SyncLogItem = {
  id: number;
  task: string;
  status: TushareSyncStatus;
  tradeDate: string | null;
  message: string | null;
  payload: Record<string, unknown> | null;
  startedAt: string;
  finishedAt: string | null;
};

export type SyncLogQuery = {
  task?: string;
  status?: TushareSyncStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
};

export type SyncLogSummaryItem = {
  task: string;
  lastSyncAt: string | null;
  lastStatus: string | null;
  lastRowCount: number | null;
  consecutiveFailures: number;
};

// ── 数据质量 ──

export type DataQualityCheckItem = {
  id: number;
  checkDate: string;
  dataSet: string;
  checkType: 'completeness' | 'timeliness' | 'cross-table' | string;
  status: string;
  message: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

/** Phase 4: 质量检查聚合摘要 */
export type QualityCheckSummary = {
  checkedAt: string;
  totalDataSets: number;
  counts: { pass: number; warn: number; fail: number };
  failures: Array<{ dataSet: string; checkType: string; message: string }>;
  crossTableCounts: { pass: number; warn: number; fail: number };
  autoRepairTriggered: boolean;
  repairTaskCount: number;
};

/** Phase 4: 自动补数摘要 */
export type RepairSummary = {
  totalChecked: number;
  repairTasks: number;
  executed: number;
  tasks: Array<{
    dataSet: string;
    repairType: 'resync-dates' | 'resync-dataset' | 'no-action';
    missingDates?: string[];
    sourceReport: {
      dataSet: string;
      checkType: string;
      status: string;
      message: string | null;
    };
  }>;
};

/** Phase 4: 补数队列状态 */
export type RepairQueueStatus = {
  pending: number;
  retrying: number;
  succeeded: number;
  exhausted: number;
};

/** Phase 4: 数据质量健康状态 */
export type QualityHealthStatus = {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheckAt: string | null;
  failCount: number;
  exhaustedRepairs: number;
};

export type DataGapsResult = {
  dataSet: string;
  gaps: string[];
  total: number;
};

// ── 校验异常日志 ──

export type ValidationLogItem = {
  id: number;
  task: string;
  tradeDate: string;
  tsCode: string | null;
  ruleName: string;
  severity: string;
  message: string;
  rawData: Record<string, unknown> | null;
  createdAt: string;
};

// ── 重试队列 ──

export type RetryQueueItem = {
  id: number;
  task: string;
  failedKey: string | null;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string;
  status: TushareSyncRetryStatus;
  createdAt: string;
  updatedAt: string;
};

// ----------------------------------------------------------------------
// API 封装
// ----------------------------------------------------------------------

export const tushareSyncApi = {
  /** 获取所有可用的同步任务计划（仅超级管理员） */
  getPlans: (): Promise<TushareSyncPlan[]> =>
    apiClient.post<TushareSyncPlan[]>('/api/tushare/admin/plans'),

  /**
   * 手动触发同步（异步，202 Accepted 立即返回，结果通过 WebSocket 推送）
   * @param mode      增量(incremental) 或 全量(full)
   * @param tasks     指定任务列表；不传则执行所有支持手动同步的任务
   */
  manualSync: (mode: TushareSyncMode, tasks?: string[]): Promise<ManualSyncAccepted> =>
    apiClient.post<ManualSyncAccepted>('/api/tushare/admin/sync', { mode, tasks }),

  // ── 缓存统计 ──

  /** 获取缓存命中率与键统计 */
  getCacheStats: (): Promise<CacheMetricsData> =>
    apiClient.post<CacheMetricsData>('/api/tushare/admin/cache/stats'),

  // ── 数据质量 ──

  /** 手动触发数据质量检查（异步，202 Accepted） */
  triggerQualityCheck: (): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>('/api/tushare/admin/quality/check'),

  /** 查询最近 N 天数据质量检查结果 */
  getQualityReport: (days?: number): Promise<DataQualityCheckItem[]> =>
    apiClient.post<DataQualityCheckItem[]>('/api/tushare/admin/quality/report', { days }),

  /** 查询指定数据集的缺失日期 */
  getDataGaps: (dataSet: string): Promise<DataGapsResult> =>
    apiClient.post<DataGapsResult>('/api/tushare/admin/quality/gaps', { dataSet }),

  /** 查询数据校验异常日志 */
  getValidationLogs: (task?: string, limit?: number): Promise<ValidationLogItem[]> =>
    apiClient.post<ValidationLogItem[]>('/api/tushare/admin/validation-logs', { task, limit }),

  // ── Phase 3 / Phase 4 数据质量增强 ──

  /** Phase 3: 手动触发跨表对账 */
  runCrossTableCheck: (mode: 'recent' | 'full' = 'recent'): Promise<DataQualityCheckItem[]> =>
    apiClient.post<DataQualityCheckItem[]>('/api/tushare/admin/quality/cross-check', { mode }),

  /** Phase 4: 查询最近一轮质量检查摘要 */
  getQualitySummary: (): Promise<QualityCheckSummary> =>
    apiClient.post<QualityCheckSummary>('/api/tushare/admin/quality/summary', {}),

  /** Phase 4: 手动触发自动补数 */
  triggerAutoRepair: (): Promise<RepairSummary> =>
    apiClient.post<RepairSummary>('/api/tushare/admin/quality/repair', {}),

  /** Phase 4: 查询补数任务队列状态 */
  getRepairQueueStatus: (): Promise<RepairQueueStatus> =>
    apiClient.post<RepairQueueStatus>('/api/tushare/admin/quality/repair-status', {}),

  /** Phase 4: 查询数据质量健康状态 */
  getQualityHealth: (): Promise<QualityHealthStatus> =>
    apiClient.post<QualityHealthStatus>('/api/tushare/admin/quality/health', {}),

  // ── 同步日志 ──

  /** 分页查询同步日志 */
  getSyncLogs: (query: SyncLogQuery): Promise<PaginatedResult<SyncLogItem>> =>
    apiClient.post<PaginatedResult<SyncLogItem>>('/api/tushare/admin/sync-logs', query),

  /** 各任务最后同步状态汇总 */
  getSyncLogsSummary: (): Promise<SyncLogSummaryItem[]> =>
    apiClient.post<SyncLogSummaryItem[]>('/api/tushare/admin/sync-logs/summary'),

  // ── 重试队列 ──

  /** 分页查询失败重试队列 */
  getRetryQueue: (
    status?: TushareSyncRetryStatus,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedResult<RetryQueueItem>> =>
    apiClient.post<PaginatedResult<RetryQueueItem>>('/api/tushare/admin/retry-queue', {
      status,
      page,
      pageSize,
    }),

  /** 重置耗尽重试记录为 PENDING */
  resetRetryQueue: (task?: string): Promise<{ message: string; count: number }> =>
    apiClient.post<{ message: string; count: number }>('/api/tushare/admin/retry-queue/reset', {
      task,
    }),
};
