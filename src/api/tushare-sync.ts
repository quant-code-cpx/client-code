import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义（对应后端 tushare-admin 接口）
// ----------------------------------------------------------------------

export type TushareSyncMode = 'incremental' | 'full';

export type TushareSyncCategory = 'basic' | 'market' | 'financial' | 'moneyflow';

export type TushareSyncSchedule = {
  cron: string;
  timeZone: string;
  /** 人类可读的定时描述，如"交易日盘后同步" */
  description: string;
  tradingDayOnly: boolean;
};

/** 单个同步任务计划（GET /api/tushare/admin/plans 返回数组） */
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
 * 手动同步触发响应（POST /api/tushare/admin/sync 返回 202 Accepted）
 * 实际同步结果通过 WebSocket 事件 tushare_sync_completed / tushare_sync_failed 返回
 */
export type ManualSyncAccepted = {
  message: string;
};

// ----------------------------------------------------------------------
// API 封装
// ----------------------------------------------------------------------

export const tushareSyncApi = {
  /** 获取所有可用的同步任务计划（仅超级管理员） */
  getPlans: (): Promise<TushareSyncPlan[]> =>
    apiClient.get<TushareSyncPlan[]>('/api/tushare/admin/plans'),

  /**
   * 手动触发同步（异步，202 Accepted 立即返回，结果通过 WebSocket 推送）
   * @param mode      增量(incremental) 或 全量(full)
   * @param tasks     指定任务列表；不传则执行所有支持手动同步的任务
   */
  manualSync: (mode: TushareSyncMode, tasks?: string[]): Promise<ManualSyncAccepted> =>
    apiClient.post<ManualSyncAccepted>('/api/tushare/admin/sync', { mode, tasks }),
};
