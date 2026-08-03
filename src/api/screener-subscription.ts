import { apiClient } from './client';

import type { ScreenerFilters } from './screener';

export type SubscriptionFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';

export type ScreenerSubscription = {
  id: number;
  name: string;
  strategyId: number | null;
  filters: Partial<ScreenerFilters>;
  sortBy: string | null;
  sortOrder: string | null;
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  lastRunAt: string | null;
  lastRunResult: {
    tradeDate: string;
    matchCount: number;
    newEntryCount: number;
    exitCount: number;
  } | null;
  lastMatchCodes: string[];
  consecutiveFails: number;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionLog = {
  id: number;
  tradeDate: string;
  matchCount: number;
  newEntryCount: number;
  exitCount: number;
  newEntryCodes: string[];
  exitCodes: string[];
  executionMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
};

export type SubscriptionLogResult = {
  logs: SubscriptionLog[];
  total: number;
  page: number;
  pageSize: number;
};

export function listSubscriptions() {
  return apiClient.post<{ subscriptions: ScreenerSubscription[] }>(
    '/api/screener-subscription/list'
  );
}

export function createSubscription(data: {
  name: string;
  strategyId?: number;
  filters?: Partial<ScreenerFilters>;
  frequency?: SubscriptionFrequency;
  sortBy?: string;
  sortOrder?: string;
}) {
  return apiClient.post<ScreenerSubscription>('/api/screener-subscription/create', data);
}

export function updateSubscription(data: {
  id: number;
  name?: string;
  filters?: Partial<ScreenerFilters>;
  frequency?: SubscriptionFrequency;
  sortBy?: string;
  sortOrder?: string;
}) {
  return apiClient.post<ScreenerSubscription>('/api/screener-subscription/update', data);
}

export function deleteSubscription(id: number) {
  return apiClient.post<{ message: string }>('/api/screener-subscription/delete', { id });
}

export function pauseSubscription(id: number) {
  return apiClient.post<ScreenerSubscription>('/api/screener-subscription/pause', { id });
}

export function resumeSubscription(id: number) {
  return apiClient.post<ScreenerSubscription>('/api/screener-subscription/resume', { id });
}

export type ManualRunResponse = {
  jobId?: string | null;
  message: string;
};

export function runSubscription(id: number) {
  return apiClient.post<ManualRunResponse>('/api/screener-subscription/run', { id });
}

/**
 * 解析后端手动执行冷却错误中的剩余秒数。
 * 后端 `manualRun` 抛出 `操作过频，请等待 N 秒后再试`。
 */
export function parseRunCooldownSeconds(message: string): number | null {
  const match = message.match(/(\d+)\s*秒/);
  if (!match) return null;
  const sec = Number(match[1]);
  return Number.isFinite(sec) && sec > 0 ? sec : null;
}

export function getSubscriptionLogs(id: number, page = 1, pageSize = 20) {
  return apiClient.post<SubscriptionLogResult>('/api/screener-subscription/logs', {
    id,
    page,
    pageSize,
  });
}

export function getSubscriptionById(id: number): Promise<ScreenerSubscription> {
  return apiClient.post<ScreenerSubscription>('/api/screener-subscription/detail', { id });
}
