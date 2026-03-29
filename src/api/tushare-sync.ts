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

/** 手动同步执行结果（POST /api/tushare/admin/sync 返回） */
export type ManualSyncResult = {
  trigger: 'bootstrap' | 'schedule' | 'manual';
  mode: TushareSyncMode;
  executedTasks: string[];
  skippedTasks: string[];
  failedTasks: string[];
  targetTradeDate: string | null;
  /** 总耗时（秒） */
  elapsedSeconds: number;
};

// ----------------------------------------------------------------------
// API 封装
// ----------------------------------------------------------------------

export const tushareSyncApi = {
  /** 获取所有可用的同步任务计划（仅超级管理员） */
  getPlans: (): Promise<TushareSyncPlan[]> =>
    apiClient.get<TushareSyncPlan[]>('/api/tushare/admin/plans'),

  /**
   * 手动执行同步
   * @param mode      增量(incremental) 或 全量(full)
   * @param tasks     指定任务列表；不传则执行所有支持手动同步的任务
   */
  manualSync: (mode: TushareSyncMode, tasks?: string[]): Promise<ManualSyncResult> =>
    apiClient.post<ManualSyncResult>('/api/tushare/admin/sync', { mode, tasks }),
};
