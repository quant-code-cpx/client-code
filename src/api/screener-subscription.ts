import { apiClient } from './client';

import type { ScreenerFilters } from './screener';

// ----------------------------------------------------------------------
// v3 rule protocol — kept in sync with server-code/docs/design/条件订阅规则引擎-后端设计.md
// ----------------------------------------------------------------------

export type SubscriptionFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'ERROR';
export type SubscriptionRuleType =
  | 'STOCK_SCREENING'
  | 'FACTOR_SCREENING'
  | 'SIGNAL_EVENT'
  | 'COMPOSITE';

export type UniverseSpec =
  | {
      type: 'ALL_A';
      excludeSt: boolean;
      excludeSuspended: boolean;
      excludeBse: boolean;
    }
  | {
      type: 'WATCHLIST_GROUP';
      groupId: number;
      excludeSt: boolean;
      excludeSuspended: boolean;
    }
  | { type: 'FIXED'; tsCodes: string[] };

export type FactorRuleOperator =
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'BETWEEN'
  | 'TOP_PERCENT'
  | 'BOTTOM_PERCENT';

export type SignalEventType =
  | 'GOLDEN_CROSS'
  | 'DEATH_CROSS'
  | 'OVERBOUGHT_ENTER'
  | 'OVERSOLD_ENTER'
  | 'BREAK_UP'
  | 'BREAK_DOWN'
  | 'BULLISH_STATE_ENTER'
  | 'BEARISH_STATE_ENTER'
  | 'VOLUME_EXPAND'
  | 'VOLUME_SHRINK'
  | 'SCORE_CROSS_UP'
  | 'SCORE_CROSS_DOWN';

export type StockScreeningRuleSpec = {
  type: 'STOCK_SCREENING';
  version: 1;
  universe: UniverseSpec;
  filters: Partial<ScreenerFilters>;
};

export type FactorConditionSpec = {
  factorId: string;
  operator: FactorRuleOperator;
  value: number | [number, number];
};

export type FactorScreeningRuleSpec = {
  type: 'FACTOR_SCREENING';
  version: 1;
  universe: UniverseSpec;
  conditions: FactorConditionSpec[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
};

export type SignalConditionSpec = {
  metricId: string;
  eventType: SignalEventType;
  threshold?: number;
  strengthAtLeast?: number;
};

export type SignalEventRuleSpec = {
  type: 'SIGNAL_EVENT';
  version: 1;
  universe: UniverseSpec;
  conditions: SignalConditionSpec[];
  minSatisfied: number;
};

export type SubscriptionRuleSpec =
  | StockScreeningRuleSpec
  | FactorScreeningRuleSpec
  | SignalEventRuleSpec;

export type SubscriptionTriggerSpec = {
  mode: 'ENTER' | 'EXIT' | 'BOTH' | 'EVENT';
  notifyOnInitialMatch: boolean;
  eventWindow: 'CURRENT_TRADE_DATE' | 'SINCE_LAST_SUCCESS';
  cooldownTradingDays: number;
  maxHitsPerNotification: number;
};

export type MetricDefinition = {
  id: string;
  version: number;
  source: 'STOCK' | 'FACTOR' | 'SIGNAL';
  category: string;
  label: string;
  description: string;
  valueType: 'NUMBER' | 'PERCENT' | 'ENUM' | 'BOOLEAN' | 'EVENT';
  unit?: string;
  operators: string[];
  enumOptions?: Array<{ label: string; value: string }>;
  /** STOCK 指标对应的选股筛选字段，由后端 Metric Catalog 声明。 */
  filterKey?: string;
  min?: number;
  max?: number;
  precision?: number;
  requiredDataSets: string[];
  availability: 'ENABLED' | 'DISABLED' | 'DATA_NOT_READY';
  semanticsVersion: string;
};

export type SubscriptionMetricCatalog = {
  catalogVersion: string;
  metrics: MetricDefinition[];
  warnings?: Array<{ code: string; message: string }>;
};

export type SubscriptionHitEvidence = {
  tsCode: string;
  metricId: string;
  metricLabel: string;
  operator: string;
  previousValue?: number | string | null;
  currentValue?: number | string | null;
  compareValue?: number | string | [number, number];
  reason: string;
};

export type SubscriptionPreviewResult = {
  ruleFingerprint: string;
  catalogVersion: string;
  asOfTradeDate: string;
  universeCount: number;
  matchedCount: number;
  truncated: boolean;
  matchedStocks: Array<{ tsCode: string; name: string | null; industry?: string | null }>;
  evidence: SubscriptionHitEvidence[];
  warnings: Array<{ code: string; message: string }>;
  dataVersions: Record<string, string>;
  executionMs: number;
};

export type SubscriptionHit = SubscriptionHitEvidence & {
  id: number;
  kind: 'ENTER' | 'EXIT' | 'EVENT';
  tradeDate: string;
  createdAt: string;
};

export type SubscriptionHitsResult = {
  hits: SubscriptionHit[];
  total: number;
  page: number;
  pageSize: number;
};

export type SubscriptionRunStatus = {
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  message?: string;
  completedAt?: string | null;
};

export type ScreenerSubscription = {
  id: number;
  name: string;
  strategyId: number | null;
  filters: Partial<ScreenerFilters>;
  sortBy: string | null;
  sortOrder: string | null;
  ruleType?: SubscriptionRuleType;
  ruleVersion?: number;
  ruleSpec?: SubscriptionRuleSpec | null;
  triggerSpec?: Partial<SubscriptionTriggerSpec> | null;
  ruleFingerprint?: string | null;
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  lastRunAt: string | null;
  lastEvaluatedTradeDate?: string | null;
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
  errorCode?: string | null;
  ruleVersion?: number;
  triggerCount?: number;
  dataVersions?: Record<string, string> | null;
  createdAt: string;
};

export type SubscriptionLogResult = {
  logs: SubscriptionLog[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateSubscriptionRequest = {
  name: string;
  frequency?: SubscriptionFrequency;
  status?: Extract<SubscriptionStatus, 'ACTIVE' | 'PAUSED'>;
  ruleSpec?: SubscriptionRuleSpec;
  triggerSpec?: Partial<SubscriptionTriggerSpec>;
  notificationSpec?: { inApp: boolean; maxHitsPerNotification?: number };
  strategyId?: number;
  filters?: Partial<ScreenerFilters>;
  sortBy?: string;
  sortOrder?: string;
};

export type UpdateSubscriptionRequest = Partial<CreateSubscriptionRequest> & {
  id: number;
  expectedUpdatedAt?: string;
};

export type ValidateSubscriptionRuleRequest = {
  id?: number;
  ruleSpec?: SubscriptionRuleSpec;
  triggerSpec?: Partial<SubscriptionTriggerSpec>;
  catalogVersion?: string;
  filters?: Partial<ScreenerFilters>;
  strategyId?: number;
};

export type ValidateSubscriptionRuleResult = {
  ruleFingerprint?: string;
  catalogVersion?: string;
  valid?: boolean;
  warnings?: Array<{ code: string; message: string }>;
  hasDuplicate?: boolean;
  similarSubscriptions?: Array<{ id: number; name: string; similarity: string }>;
};

export function listSubscriptions() {
  return apiClient.post<{ subscriptions: ScreenerSubscription[] }>(
    '/api/screener-subscription/list'
  );
}

export function createSubscription(data: CreateSubscriptionRequest) {
  return apiClient.post<ScreenerSubscription>('/api/screener-subscription/create', data);
}

export function updateSubscription(data: UpdateSubscriptionRequest) {
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

export function getSubscriptionRunStatus(jobId: string) {
  return apiClient.post<SubscriptionRunStatus>('/api/screener-subscription/run/status', { jobId });
}

export function getSubscriptionMetrics(sources?: MetricDefinition['source'][]) {
  return apiClient.post<SubscriptionMetricCatalog>('/api/screener-subscription/metrics', {
    sources,
  });
}

export function validateSubscriptionRule(data: ValidateSubscriptionRuleRequest) {
  return apiClient.post<ValidateSubscriptionRuleResult>(
    '/api/screener-subscription/validate',
    data
  );
}

export function previewSubscriptionRule(
  data: {
    ruleSpec: SubscriptionRuleSpec;
    triggerSpec?: Partial<SubscriptionTriggerSpec>;
    tradeDate?: string;
    limit?: number;
  },
  signal?: AbortSignal
) {
  return apiClient.post<SubscriptionPreviewResult>(
    '/api/screener-subscription/preview',
    data,
    signal
  );
}

export function getSubscriptionHits(
  id: number,
  logId: number,
  page = 1,
  pageSize = 20,
  kind?: SubscriptionHit['kind']
) {
  return apiClient.post<SubscriptionHitsResult>('/api/screener-subscription/hits', {
    id,
    logId,
    page,
    pageSize,
    kind,
  });
}

/** Parse legacy manual-run cooldown errors. */
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
