import { apiClient } from './client';

// ----------------------------------------------------------------------

export type LastRunSummary = {
  runId: string;
  runAt: string;
  totalReturn: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  status: string;
};

export type Strategy = {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  backtestDefaults: Record<string, unknown> | null;
  tags: string[];
  version: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  lastRunSummary?: LastRunSummary;
  hasActiveSignal?: boolean;
};

export type CreateStrategyRequest = {
  name: string;
  description?: string;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  backtestDefaults?: Record<string, unknown>;
  tags?: string[];
};

export type ListStrategiesRequest = {
  strategyType?: string;
  tags?: string[];
  keyword?: string;
  page?: number;
  pageSize?: number;
  minTotalReturn?: number;
  minSharpeRatio?: number;
  hasActiveSignal?: boolean;
};

export type ListStrategiesResponse = {
  strategies: Strategy[];
  total: number;
  page: number;
  pageSize: number;
};

export type UpdateStrategyRequest = {
  id: string;
  name?: string;
  description?: string;
  strategyConfig?: Record<string, unknown>;
  backtestDefaults?: Record<string, unknown>;
  tags?: string[];
};

export type CloneStrategyRequest = {
  id: string;
  name?: string;
};

export type RunStrategyRequest = {
  strategyId: string;
  startDate: string; // YYYYMMDD
  endDate: string; // YYYYMMDD
  initialCapital: number;
  name?: string;
  benchmarkTsCode?: string;
  universe?: string;
  rebalanceFrequency?: string;
  priceMode?: string;
  commissionRate?: number;
  stampDutyRate?: number;
  minCommission?: number;
  slippageBps?: number;
  maxPositions?: number;
  maxWeightPerStock?: number;
  minDaysListed?: number;
  enableTradeConstraints?: boolean;
  enableT1Restriction?: boolean;
  partialFillEnabled?: boolean;
};

export type RunStrategyResponse = {
  runId: string;
  status: 'QUEUED';
  jobId: string;
};

export type StrategySchemas = Record<string, unknown>;

// ----------------------------------------------------------------------

export function createStrategy(data: CreateStrategyRequest) {
  return apiClient.post<Strategy>('/api/strategies/create', data);
}

export function listStrategies(query: ListStrategiesRequest) {
  return apiClient.post<ListStrategiesResponse>('/api/strategies/list', query);
}

export function getStrategyDetail(query: { id: string }) {
  return apiClient.post<Strategy>('/api/strategies/detail', query);
}

export function updateStrategy(data: UpdateStrategyRequest) {
  return apiClient.post<Strategy>('/api/strategies/update', data);
}

export function deleteStrategy(query: { id: string }) {
  return apiClient.post<{ message: string }>('/api/strategies/delete', query);
}

export function cloneStrategy(data: CloneStrategyRequest) {
  return apiClient.post<Strategy>('/api/strategies/clone', data);
}

export function runStrategy(data: RunStrategyRequest) {
  return apiClient.post<RunStrategyResponse>('/api/strategies/run', data);
}

export function getStrategySchemas() {
  return apiClient.post<StrategySchemas>('/api/strategies/schemas', {});
}

// ─── 版本管理类型 ──────────────────────────────────

export type StrategyVersionItem = {
  version: number;
  strategyConfig: Record<string, unknown>;
  backtestDefaults: Record<string, unknown> | null;
  changelog: string | null;
  createdAt: string;
  isCurrent: boolean;
};

export type ConfigDiffItem = {
  path: string;
  oldValue: unknown;
  newValue: unknown;
  changeType: 'ADDED' | 'REMOVED' | 'CHANGED';
};

export type CompareVersionsRequest = {
  strategyId: string;
  versionA: number;
  versionB: number;
};

export type CompareVersionsResponse = {
  strategyId: string;
  versionA: StrategyVersionItem;
  versionB: StrategyVersionItem;
  configDiff: ConfigDiffItem[];
};

// ─── 版本管理 API ──────────────────────────────────

export function listStrategyVersions(strategyId: string) {
  return apiClient.post<StrategyVersionItem[]>('/api/strategies/versions', { strategyId });
}

export function compareStrategyVersions(dto: CompareVersionsRequest) {
  return apiClient.post<CompareVersionsResponse>('/api/strategies/compare-versions', dto);
}

// ─── 新增 API：摘要 / 业绩快照 / 删除依赖检测 ──────────────────

export type StrategySummary = {
  totalCount: number;
  activeSignalCount: number;
  recent7dRunCount: number;
  recent7dBestReturn: number | null;
  recent7dWorstReturn: number | null;
};

export type StrategyPerformance = {
  totalReturn: number | null;
  annualizedReturn: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  navSeries: Array<{ date: string; nav: number }>;
  baseline: {
    totalReturn: number | null;
    navSeries: Array<{ date: string; nav: number }>;
  } | null;
};

export type StrategyReference = {
  type: 'signal' | 'portfolio';
  id: string;
  name: string;
};

export type DeleteStrategyResponse = {
  message: string;
  blocked?: boolean;
  references?: StrategyReference[];
};

export function getStrategySummary() {
  return apiClient.post<StrategySummary>('/api/strategies/summary', {});
}

export function getStrategyPerformance(strategyId: string) {
  return apiClient.post<StrategyPerformance>('/api/strategies/performance', { strategyId });
}

export function deleteStrategyWithCheck(id: string, force = false) {
  return apiClient.post<DeleteStrategyResponse>('/api/strategies/delete', { id, force });
}

export function checkStrategyName(name: string, excludeId?: string) {
  return apiClient.post<{ available: boolean }>('/api/strategies/check-name', {
    name,
    ...(excludeId ? { excludeId } : {}),
  });
}
