import { apiClient } from './client';

// ─── 模板 ────────────────────────────────────────

export type StrategyTemplate = {
  id: 'MA_CROSS_SINGLE' | 'SCREENING_ROTATION' | 'FACTOR_RANKING' | 'CUSTOM_POOL_REBALANCE';
  name: string;
  description: string;
  category: 'TECHNICAL' | 'SCREENING' | 'FACTOR' | 'CUSTOM';
  defaultConfig?: Record<string, unknown>;
  recommendedRange?: { years: number };
  tags?: string[];
  difficulty?: 'BASIC' | 'STANDARD' | 'ADVANCED';
  parameterSchema: Array<{
    field: string;
    label: string;
    type: 'string' | 'number' | 'select' | 'multiselect' | 'boolean' | 'json';
    required: boolean;
    defaultValue?: unknown;
    options?: Array<{ label: string; value: string }>;
    placeholder?: string;
    helpText?: string;
  }>;
};

export type GetStrategyTemplatesResponse = {
  templates: StrategyTemplate[];
};

// ─── 校验 / 提交 ─────────────────────────────────

export type ValidateBacktestRunQuery = {
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  startDate: string;
  endDate: string;
  benchmarkTsCode?: string;
  universe?: string;
  initialCapital: number;
  rebalanceFrequency?: string;
  priceMode?: string;
  enableTradeConstraints?: boolean;
  enableT1Restriction?: boolean;
  partialFillEnabled?: boolean;
};

export type ValidateBacktestRunResponse = {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  fieldErrors?: Array<{
    path: string;
    message: string;
  }>;
  estimatedRebalanceCount?: number;
  estimatedTradeCount?: number;
  estimatedRuntimeSeconds?: number;
  dataGapPercentage?: number;
  recommendedBenchmark?: string;
  similarCompletedRuns?: Array<{
    runId: string;
    name: string | null;
    createdAt: string;
    totalReturn: number | null;
    similarityScore: number;
  }>;
  dataReadiness: {
    hasDaily: boolean;
    hasAdjFactor: boolean;
    hasTradeCal: boolean;
    hasIndexDaily: boolean;
    hasStkLimit: boolean;
    hasSuspendD: boolean;
    hasIndexWeight: boolean;
  };
  stats: {
    tradingDays: number;
    estimatedUniverseSize: number | null;
    earliestAvailableDate: string | null;
    latestAvailableDate: string | null;
  };
};

export type CreateBacktestRunQuery = {
  name?: string;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  startDate: string;
  endDate: string;
  benchmarkTsCode?: string;
  universe?: string;
  customUniverseTsCodes?: string[];
  initialCapital: number;
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

export type CreateBacktestRunResponse = {
  runId: string;
  jobId: string;
  status: 'QUEUED';
};

// ─── 列表 / 详情 ─────────────────────────────────

export type BacktestRunListItem = {
  runId: string;
  jobId?: string | null;
  name: string | null;
  strategyType: string;
  status: string;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  totalReturn: number | null;
  annualizedReturn: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  progress: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt: string | null;
  durationSeconds?: number | null;
  failedReason?: string | null;
  failedReasonCode?: string | null;
  failedReasonLabel?: string | null;
  strategyConfigSummary?: Record<string, unknown> | null;
  source?: string | null;
  creatorId?: number | null;
  creatorName?: string | null;
  starred?: boolean;
  archived?: boolean;
  tags?: BacktestRunTag[];
  queuePosition?: number | null;
  etaSeconds?: number | null;
};

export type BacktestRunTag = {
  id: string;
  name: string;
  color?: 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | string;
  runCount?: number;
  sortOrder?: number;
};

export type BacktestRunSortField =
  | 'createdAt'
  | 'totalReturn'
  | 'annualizedReturn'
  | 'maxDrawdown'
  | 'sharpeRatio'
  | 'durationSeconds';

export type BacktestRunListQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  statuses?: string[];
  strategyType?: string;
  strategyId?: string;
  keyword?: string;
  createdStart?: string;
  createdEnd?: string;
  sort?: BacktestRunSortField;
  order?: 'asc' | 'desc';
  archived?: boolean;
  starred?: boolean;
  failedReasonCode?: string;
  tagIds?: string[];
  creatorId?: number;
  mineOnly?: boolean;
};

export type BacktestRunListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: BacktestRunListItem[];
};

export type BacktestRunStatsResponse = {
  totalCount: number;
  completedCount?: number;
  failedCount?: number;
  runningCount?: number;
  queuedCount?: number;
  completedRate: number;
  avgDurationSeconds: number | null;
  bestSharpeRatio?: number | null;
  failedReasonTop3: Array<{
    code: string;
    label: string;
    count: number;
  }>;
};

export type BacktestRunDetailResponse = {
  runId: string;
  jobId: string | null;
  name: string | null;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress: number;
  failedReason: string | null;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  universe: string;
  initialCapital: number;
  rebalanceFrequency: string;
  priceMode: string;
  summary: {
    totalReturn: number | null;
    annualizedReturn: number | null;
    benchmarkReturn: number | null;
    excessReturn: number | null;
    maxDrawdown: number | null;
    sharpeRatio: number | null;
    sortinoRatio: number | null;
    calmarRatio: number | null;
    volatility: number | null;
    alpha: number | null;
    beta: number | null;
    informationRatio: number | null;
    winRate: number | null;
    turnoverRate: number | null;
    tradeCount: number | null;
  };
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export type BacktestEquityPoint = {
  tradeDate: string;
  nav: number;
  benchmarkNav: number;
  drawdown: number;
  dailyReturn: number;
  benchmarkReturn: number;
  exposure: number;
  cashRatio: number;
};

export type BacktestTradeItem = {
  tradeDate: string;
  tsCode: string;
  name: string | null;
  side: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  amount: number;
  commission: number;
  stampDuty: number;
  slippageCost: number;
  reason: string | null;
};

export type BacktestPositionItem = {
  tsCode: string;
  name: string | null;
  quantity: number;
  costPrice: number;
  closePrice: number;
  marketValue: number;
  weight: number;
  unrealizedPnl: number;
  holdingDays: number;
};

export type BacktestPositionResponse = {
  tradeDate: string;
  items: BacktestPositionItem[];
};

export type BacktestRebalanceLogItem = {
  signalDate: string;
  executeDate: string;
  targetCount: number;
  actualBuy: number;
  actualSell: number;
  skippedLimitUp: number;
  skippedSuspend: number;
  remark: string | null;
};

// ─── API 方法 ────────────────────────────────────

export function getStrategyTemplates() {
  return apiClient.post<GetStrategyTemplatesResponse>('/api/backtests/strategy-templates');
}

export function validateRun(query: ValidateBacktestRunQuery) {
  return apiClient.post<ValidateBacktestRunResponse>('/api/backtests/runs/validate', query);
}

export function createRun(query: CreateBacktestRunQuery) {
  return apiClient.post<CreateBacktestRunResponse>('/api/backtests/runs', query);
}

export function listRuns(query: BacktestRunListQuery) {
  return apiClient.post<BacktestRunListResponse>('/api/backtests/runs/list', query);
}

export function getRunStats(query: BacktestRunListQuery) {
  return apiClient.post<BacktestRunStatsResponse>('/api/backtests/runs/stats', query);
}

export function getRunDetail(runId: string) {
  return apiClient.post<BacktestRunDetailResponse>('/api/backtests/runs/detail', { runId });
}

export function getRunEquity(runId: string) {
  return apiClient.post<{ points: BacktestEquityPoint[] }>('/api/backtests/runs/equity', { runId });
}

export function getRunTrades(runId: string, page = 1, pageSize = 50) {
  return apiClient.post<{
    page: number;
    pageSize: number;
    total: number;
    items: BacktestTradeItem[];
  }>('/api/backtests/runs/trades', { runId, page, pageSize });
}

export function getRunPositions(runId: string, tradeDate?: string) {
  return apiClient.post<BacktestPositionResponse>(
    '/api/backtests/runs/positions',
    tradeDate ? { runId, tradeDate } : { runId }
  );
}

export function getRunRebalanceLogs(runId: string) {
  return apiClient.post<{ items: BacktestRebalanceLogItem[] }>(
    '/api/backtests/runs/rebalance-logs',
    { runId }
  );
}

export function cancelRun(runId: string) {
  return apiClient.post<{ runId: string; status: 'CANCELLED' }>('/api/backtests/runs/cancel', {
    runId,
  });
}

export function renameRun(query: { runId: string; name: string }) {
  return apiClient.post<{ runId: string; name: string; updatedAt?: string }>(
    '/api/backtests/runs/rename',
    query
  );
}

export function deleteRun(query: { runId: string; hard?: boolean }) {
  return apiClient.post<{ runId: string; deletedAt?: string; archived?: boolean }>(
    '/api/backtests/runs/delete',
    query
  );
}

export function archiveRun(query: { runId: string; archived: boolean }) {
  return apiClient.post<{ runId: string; archived: boolean }>('/api/backtests/runs/archive', query);
}

export function starRun(query: { runId: string; starred: boolean }) {
  return apiClient.post<{ runId: string; starred: boolean }>('/api/backtests/runs/star', query);
}

export function retryRun(query: { runId: string }) {
  return apiClient.post<{ sourceRunId?: string; runId: string; jobId: string; status: string }>(
    '/api/backtests/runs/retry',
    query
  );
}

export function listRunTags(query: { keyword?: string; includeCount?: boolean } = {}) {
  return apiClient.post<{ items: BacktestRunTag[] }>('/api/backtests/runs/tags/list', query);
}

export function setRunTags(query: { runId: string; tagIds: string[] }) {
  return apiClient.post<{ runId: string; tags: BacktestRunTag[] }>(
    '/api/backtests/runs/tags/set-for-run',
    query
  );
}

export function batchAttachRunTags(query: { runIds: string[]; tagIds: string[] }) {
  return apiClient.post<{
    successCount: number;
    failed: Array<{ runId: string; message: string }>;
  }>('/api/backtests/runs/tags/batch-attach', query);
}

// ─── Walk-Forward 类型 ────────────────────────────

export type StrategyTypeValue =
  | 'MA_CROSS_SINGLE'
  | 'SCREENING_ROTATION'
  | 'FACTOR_RANKING'
  | 'CUSTOM_POOL_REBALANCE';

export type ParamSearchSpaceItem = {
  type: 'range' | 'enum';
  min?: number;
  max?: number;
  step?: number;
  values?: (string | number | boolean)[];
};

export type CreateWalkForwardRunQuery = {
  name?: string;
  mode?: 'WF' | 'ROLLING';
  windowMode?: 'ROLLING' | 'ANCHORED' | 'EXPANDING';
  baseStrategyType: StrategyTypeValue;
  baseStrategyConfig: Record<string, unknown>;
  paramSearchSpace: Record<string, ParamSearchSpaceItem>;
  fullStartDate: string; // YYYYMMDD
  fullEndDate: string; // YYYYMMDD
  inSampleDays: number; // 60–2520
  outOfSampleDays: number; // 20–504
  stepDays: number; // 20–504
  optimizeMetric?: string; // 默认 'sharpeRatio'
  benchmarkTsCode?: string; // 默认 '000300.SH'
  universe?: string; // 默认 'ALL_A'
  initialCapital: number; // 最小 1000
  rebalanceFrequency?: string; // 默认 'MONTHLY'
  purgeDays?: number;
  embargoDays?: number;
  minOosTrades?: number;
};

export type CreateWalkForwardRunResponse = {
  wfRunId: string;
  jobId: string;
  status: string;
};

export type WalkForwardRunSummary = {
  wfRunId: string;
  name: string | null;
  baseStrategyType: string;
  windowMode?: 'ROLLING' | 'ANCHORED' | 'EXPANDING' | null;
  status: string;
  fullStartDate: string;
  fullEndDate: string;
  oosSharpeRatio: number | null;
  oosAnnualizedReturn: number | null;
  oosMaxDrawdown: number | null;
  wfe?: number | null;
  robustnessLevel?: 'GREEN' | 'YELLOW' | 'RED' | null;
  oosNegativeWindowRate?: number | null;
  progress: number;
  createdAt: string;
  completedAt: string | null;
};

export type WalkForwardRunListQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  statuses?: string[];
  strategyTypes?: string[];
  sortBy?: 'createdAt' | 'oosSharpeRatio' | 'oosAnnualizedReturn' | 'oosMaxDrawdown' | 'wfe';
  sortDir?: 'asc' | 'desc';
};

export type WalkForwardRunListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: WalkForwardRunSummary[];
  aggregates?: {
    total: number;
    running: number;
    avgOosSharpe: number | null;
    lastCompletedAt: string | null;
  };
};

export type WalkForwardWindow = {
  windowIndex: number;
  isStartDate: string;
  isEndDate: string;
  oosStartDate: string;
  oosEndDate: string;
  optimizedParams: Record<string, unknown> | null;
  isReturn: number | null;
  isSharpe: number | null;
  oosReturn: number | null;
  oosSharpe: number | null;
  oosMaxDrawdown: number | null;
  status?: 'OK' | 'FAILED' | null;
  errorReason?: string | null;
  oosTrades?: number | null;
};

export type WalkForwardRunDetail = {
  wfRunId: string;
  jobId?: string;
  name: string | null;
  baseStrategyType: string;
  baseStrategyConfig?: Record<string, unknown> | null;
  paramSearchSpace?: Record<string, ParamSearchSpaceItem> | null;
  windowMode?: 'ROLLING' | 'ANCHORED' | 'EXPANDING' | null;
  purgeDays?: number | null;
  embargoDays?: number | null;
  minOosTrades?: number | null;
  robustnessLevel?: 'GREEN' | 'YELLOW' | 'RED' | null;
  wfe?: number | null;
  oosNegativeWindowRate?: number | null;
  status: string;
  progress: number;
  failedReason: string | null;
  fullStartDate: string;
  fullEndDate: string;
  inSampleDays: number;
  outOfSampleDays: number;
  stepDays: number;
  optimizeMetric: string;
  benchmarkTsCode?: string | null;
  universe?: string | null;
  initialCapital?: number | null;
  rebalanceFrequency?: string | null;
  windowCount: number | null;
  completedWindows: number | null;
  oosAnnualizedReturn: number | null;
  oosSharpeRatio: number | null;
  oosMaxDrawdown: number | null;
  isOosReturnVsIs: number | null;
  windows: WalkForwardWindow[];
  createdAt: string;
  completedAt: string | null;
};

export type WalkForwardEquityPoint = {
  tradeDate: string;
  nav: number;
  benchmarkNav?: number | null;
  windowIndex: number;
};

export type WalkForwardEquityResponse = {
  points: WalkForwardEquityPoint[];
  windows?: Array<{
    windowIndex: number;
    isStartDate: string;
    isEndDate: string;
    oosStartDate: string;
    oosEndDate: string;
  }>;
};

export type WalkForwardWindowDetailResponse = {
  wfRunId: string;
  windowIndex: number;
  window: WalkForwardWindow;
  equity?: WalkForwardEquityPoint[];
};

export type WalkForwardWindowTrade = BacktestTradeItem & {
  wfRunId?: string;
  windowIndex?: number;
};

export type WalkForwardWindowPosition = BacktestPositionItem & {
  tradeDate?: string;
};

export type WalkForwardWindowRebalanceLog = BacktestRebalanceLogItem & {
  windowIndex?: number;
};

// ─── Walk-Forward API ─────────────────────────────

export function createWalkForwardRun(query: CreateWalkForwardRunQuery) {
  return apiClient.post<CreateWalkForwardRunResponse>('/api/backtests/walk-forward/runs', query);
}

export function listWalkForwardRuns(query: WalkForwardRunListQuery) {
  return apiClient.post<WalkForwardRunListResponse>('/api/backtests/walk-forward/runs/list', query);
}

export function getWalkForwardRunDetail(wfRunId: string) {
  return apiClient.post<WalkForwardRunDetail>('/api/backtests/walk-forward/runs/detail', {
    wfRunId,
  });
}

export function getWalkForwardEquity(wfRunId: string) {
  return apiClient.post<WalkForwardEquityResponse>('/api/backtests/walk-forward/runs/equity', {
    wfRunId,
  });
}

export function cancelWalkForwardRun(wfRunId: string) {
  return apiClient.post<{ wfRunId: string; status: string }>(
    '/api/backtests/walk-forward/runs/cancel',
    {
      wfRunId,
    }
  );
}

export function deleteWalkForwardRun(wfRunId: string) {
  return apiClient.post<{ wfRunId: string; deletedAt?: string }>(
    '/api/backtests/walk-forward/runs/delete',
    {
      wfRunId,
    }
  );
}

export function cloneWalkForwardRun(wfRunId: string, name?: string) {
  return apiClient.post<
    CreateWalkForwardRunQuery | { wfRunId: string; jobId?: string; status?: string }
  >('/api/backtests/walk-forward/runs/clone', name ? { wfRunId, name } : { wfRunId });
}

export function getWalkForwardWindowDetail(wfRunId: string, windowIndex: number) {
  return apiClient.post<WalkForwardWindowDetailResponse>(
    '/api/backtests/walk-forward/runs/window-detail',
    { wfRunId, windowIndex }
  );
}

export function getWalkForwardWindowTrades(wfRunId: string, windowIndex: number) {
  return apiClient.post<{ items: WalkForwardWindowTrade[] }>(
    '/api/backtests/walk-forward/runs/window-trades',
    { wfRunId, windowIndex }
  );
}

export function getWalkForwardWindowPositions(
  wfRunId: string,
  windowIndex: number,
  tradeDate?: string
) {
  return apiClient.post<{ items: WalkForwardWindowPosition[] }>(
    '/api/backtests/walk-forward/runs/window-positions',
    tradeDate ? { wfRunId, windowIndex, tradeDate } : { wfRunId, windowIndex }
  );
}

export function getWalkForwardWindowRebalanceLogs(wfRunId: string, windowIndex: number) {
  return apiClient.post<{ items: WalkForwardWindowRebalanceLog[] }>(
    '/api/backtests/walk-forward/runs/window-rebalance-logs',
    { wfRunId, windowIndex }
  );
}

// ─── 多策略对比类型 ────────────────────────────────

export type ComparisonStrategyItem = {
  label?: string;
  strategyType: StrategyTypeValue | string;
  strategyConfig: Record<string, unknown>;
  rebalanceFrequency?: string;
  priceMode?: string;
  costOverride?: Partial<ComparisonCostConfig>;
  constraintOverride?: Partial<ComparisonConstraintConfig>;
};

export type ComparisonCostConfig = {
  priceMode?: string | null;
  commissionRate?: number | null;
  stampDutyRate?: number | null;
  minCommission?: number | null;
  slippageBps?: number | null;
};

export type ComparisonConstraintConfig = {
  maxPositions?: number | null;
  maxWeightPerStock?: number | null;
  minDaysListed?: number | null;
  enableTradeConstraints?: boolean | null;
  enableT1Restriction?: boolean | null;
  partialFillEnabled?: boolean | null;
};

export type CreateComparisonQuery = {
  name?: string;
  strategies: ComparisonStrategyItem[]; // 2–10 个策略
  startDate: string; // YYYYMMDD
  endDate: string;
  benchmarkTsCode?: string;
  universe?: string;
  initialCapital: number;
  priceMode?: string;
  commissionRate?: number;
  stampDutyRate?: number;
  minCommission?: number;
  slippageBps?: number;
  maxPositions?: number;
  maxWeightPerStock?: number;
  minDaysListed?: number;
};

export type CreateComparisonResponse = {
  groupId: string;
  jobId: string;
  status: string;
};

export type ComparisonMetricsRow = {
  runId: string;
  label: string | null;
  strategyType: string;
  totalReturn: number | null;
  annualizedReturn: number | null;
  benchmarkReturn: number | null;
  excessReturn: number | null;
  maxDrawdown: number | null;
  sharpeRatio: number | null;
  sortinoRatio: number | null;
  calmarRatio: number | null;
  volatility: number | null;
  alpha: number | null;
  beta: number | null;
  informationRatio: number | null;
  winRate: number | null;
  turnoverRate: number | null;
  tradeCount: number | null;
  recoveryDays?: number | null;
  longestDrawdownDays?: number | null;
  downsideDeviation?: number | null;
  ulcerIndex?: number | null;
};

export type ComparisonFailure = {
  runId?: string | null;
  label?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type ComparisonGroupDetail = {
  groupId: string;
  name: string | null;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED' | string;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  metrics: ComparisonMetricsRow[];
  createdAt: string;
  completedAt: string | null;
  etaSeconds?: number | null;
  failures?: ComparisonFailure[];
  progress?: number | null;
  strategyCount?: number | null;
  completedCount?: number | null;
  costConfig?: ComparisonCostConfig | null;
  constraintConfig?: ComparisonConstraintConfig | null;
};

export type ComparisonEquitySeries = {
  runId: string;
  label: string | null;
  points: Array<{
    tradeDate: string;
    nav?: number | null;
    value?: number | null;
    dailyReturn?: number | null;
    benchmarkNav?: number | null;
    benchmarkReturn?: number | null;
  }>;
};

export type ComparisonEquityResponse = {
  series: ComparisonEquitySeries[];
};

export type ComparisonEquityQuery = {
  mode?: 'NAV' | 'CUM_RET' | 'EXCESS';
  maxPoints?: number;
};

export type ComparisonListQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  strategyType?: string;
};

export type ComparisonListItem = {
  groupId: string;
  name: string | null;
  status: string;
  strategyCount: number;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  createdAt: string;
  completedAt?: string | null;
  bestSharpe?: number | null;
  bestStrategyLabel?: string | null;
  progress?: number | null;
  failedCount?: number | null;
  etaSeconds?: number | null;
  creatorName?: string | null;
};

export type ComparisonListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: ComparisonListItem[];
};

export type ComparisonConfigStrategy = {
  label?: string | null;
  strategyType?: StrategyTypeValue | string;
  type?: StrategyTypeValue | string;
  strategyConfig?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  rebalanceFrequency?: string | null;
  freq?: string | null;
  costOverride?: Partial<ComparisonCostConfig> | null;
  constraintOverride?: Partial<ComparisonConstraintConfig> | null;
};

export type ComparisonConfigResponse = {
  groupId?: string;
  commonConfig: {
    name?: string | null;
    startDate: string;
    endDate: string;
    benchmarkTsCode?: string | null;
    universe?: string | null;
    initialCapital?: number | null;
    priceMode?: string | null;
  };
  costConfig?: ComparisonCostConfig | null;
  constraintConfig?: ComparisonConstraintConfig | null;
  strategies: ComparisonConfigStrategy[];
};

export type ComparisonRollingQuery = {
  groupId: string;
  window: 60 | 120 | 252;
  metric: 'sharpe' | 'volatility' | 'beta' | 'vol';
};

export type ComparisonRollingResponse = {
  series: Array<{
    runId: string;
    label: string | null;
    points: Array<{ tradeDate: string; value: number | null }>;
  }>;
};

export type ComparisonMonthlyResponse = {
  matrix: Array<{
    runId: string;
    label: string | null;
    monthly: Array<{ ym: string; ret: number | null }>;
    yearly: Array<{ y: string; ret: number | null }>;
  }>;
};

export type ComparisonCorrelationResponse = {
  matrix: Array<{
    rowRunId: string;
    colRunId: string;
    correlation: number | null;
    sampleSize: number;
    missingRatio: number | null;
  }>;
  warnings?: Array<{ runId?: string | null; code: string; message: string }>;
};

export type ComparisonEnvelopeResponse = {
  series: Array<{ tradeDate: string; nav: number | null; dailyReturn: number | null }>;
  constituents: Array<{ runId: string; label: string | null; weight: number | null }>;
};

// ─── 多策略对比 API ────────────────────────────────

export function createComparison(query: CreateComparisonQuery) {
  return apiClient.post<CreateComparisonResponse>('/api/backtests/comparisons', query);
}

export function listComparisons(query: ComparisonListQuery) {
  return apiClient.post<ComparisonListResponse>('/api/backtests/comparisons/list', query);
}

export function getComparisonDetail(groupId: string) {
  return apiClient.post<ComparisonGroupDetail>('/api/backtests/comparisons/detail', { groupId });
}

export function getComparisonEquity(groupId: string, query: ComparisonEquityQuery = {}) {
  return apiClient.post<ComparisonEquityResponse>('/api/backtests/comparisons/equity', {
    groupId,
    ...query,
  });
}

export function getComparisonConfig(groupId: string) {
  return apiClient.post<ComparisonConfigResponse>('/api/backtests/comparisons/config', { groupId });
}

export function getComparisonRolling(query: ComparisonRollingQuery) {
  return apiClient.post<ComparisonRollingResponse>('/api/backtests/comparisons/rolling', query);
}

export function getComparisonMonthly(groupId: string) {
  return apiClient.post<ComparisonMonthlyResponse>('/api/backtests/comparisons/monthly', {
    groupId,
  });
}

export function getComparisonCorrelation(query: {
  groupId: string;
  method?: 'pearson';
  minSamples?: number;
}) {
  return apiClient.post<ComparisonCorrelationResponse>(
    '/api/backtests/comparisons/correlation',
    query
  );
}

export function getComparisonEnvelope(query: {
  groupId: string;
  mode?: 'EQUAL_WEIGHT_DAILY_REBALANCE';
}) {
  return apiClient.post<ComparisonEnvelopeResponse>('/api/backtests/comparisons/envelope', query);
}

export function appendComparisonStrategies(query: {
  groupId: string;
  strategies: ComparisonStrategyItem[];
}) {
  return apiClient.post<{ jobId: string; status: string; addedRunIds?: string[] }>(
    '/api/backtests/comparisons/append',
    query
  );
}

export function cancelComparison(groupId: string) {
  return apiClient.post<{ groupId: string; status: string; cancelledCount?: number }>(
    '/api/backtests/comparisons/cancel',
    { groupId }
  );
}

export function deleteComparison(groupId: string) {
  return apiClient.post<{ groupId: string; success?: boolean; deletedAt?: string }>(
    '/api/backtests/comparisons/delete',
    { groupId }
  );
}

// ─── 滚动窗口回测类型 ──────────────────────────────

export type CreateRollingBacktestQuery = {
  name?: string;
  strategyType: StrategyTypeValue;
  strategyConfig: Record<string, unknown>;
  rollingParamSpace: Record<string, ParamSearchSpaceItem>;
  startDate: string; // YYYYMMDD
  endDate: string;
  lookbackDays: number; // 最小 60
  holdingPeriodDays: number; // 最小 20
  optimizeMetric?: string;
  benchmarkTsCode?: string;
  universe?: string;
  initialCapital: number;
  rebalanceFrequency?: string;
};

// ─── 滚动窗口回测 API ─────────────────────────────

export function createRollingBacktest(query: CreateRollingBacktestQuery) {
  return apiClient.post<CreateWalkForwardRunResponse>('/api/backtests/rolling/runs', query);
}

// ─── 归因分析类型 ──────────────────────────────────

export type BrinsonAttributionRequest = {
  runId: string;
  benchmarkTsCode?: string;
  industryLevel?: 'L1' | 'L2';
  granularity?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
};

export type BrinsonIndustryDetail = {
  industryCode: string;
  industryName: string;
  portfolioWeight: number;
  benchmarkWeight: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  totalEffect: number;
};

export type BrinsonPeriodItem = {
  periodLabel: string;
  totalAllocationEffect: number;
  totalSelectionEffect: number;
  totalInteractionEffect: number;
  totalActiveReturn: number;
  industries: BrinsonIndustryDetail[];
};

export type BrinsonAttributionResponse = {
  runId: string;
  granularity: string;
  industryLevel: string;
  periods: BrinsonPeriodItem[];
  cumulative: {
    totalAllocationEffect: number;
    totalSelectionEffect: number;
    totalInteractionEffect: number;
    totalActiveReturn: number;
  };
};

// ─── 成本敏感性类型 ────────────────────────────────

export type CostSensitivityRequest = {
  runId: string;
  commissionRates?: number[];
  slippageBpsList?: number[];
};

export type CostSensitivityResultRow = {
  commissionRate: number;
  stampDutyRate: number;
  slippageBps: number;
  totalReturn: number | null;
  annualizedReturn: number | null;
  sharpeRatio: number | null;
  maxDrawdown: number | null;
  totalCost: number | null;
};

export type CostSensitivityResponse = {
  runId: string;
  baselineMetrics: Record<string, number | null>;
  results: CostSensitivityResultRow[];
};

// ─── 参数敏感性类型 ────────────────────────────────

export type ParamSensitivityRequest = {
  runId: string;
  paramX: { paramKey: string; label?: string; values: (string | number | boolean)[] };
  paramY?: { paramKey: string; label?: string; values: (string | number | boolean)[] };
  metric?: string;
};

export type ParamSensitivityCreateResponse = {
  sweepId: string;
  totalCombinations: number;
  status: string;
  metric: string;
};

export type ParamSensitivityResult = {
  sweepId: string;
  baseRunId: string;
  status: string;
  totalCombinations: number;
  completedCount: number;
  metric: string;
  paramX: { paramKey: string; label?: string; values: (string | number | boolean)[] };
  paramY?: { paramKey: string; label?: string; values: (string | number | boolean)[] };
  heatmap: number[][];
  best?: Record<string, unknown>;
};

// ─── 归因 / 成本 / 参数敏感性 API ─────────────────

export function runAttribution(dto: BrinsonAttributionRequest) {
  return apiClient.post<BrinsonAttributionResponse>('/api/backtests/runs/attribution', dto);
}

/** BE returns { points: CostSensitivityPointDto[], originalCommissionRate, ... };
 *  adapter maps to FE convention { results, baselineMetrics } */
export async function analyzeCostSensitivity(
  dto: CostSensitivityRequest
): Promise<CostSensitivityResponse> {
  const res = await apiClient.post<{
    runId: string;
    originalCommissionRate: number;
    originalSlippageBps: number;
    baselineTotalReturn: number;
    points: Array<{
      commissionRate: number;
      slippageBps: number;
      totalReturn: number | null;
      annualizedReturn: number | null;
      sharpeRatio: number | null;
      maxDrawdown: number | null;
      totalCost: number | null;
      costCapitalRatio: number | null;
    }>;
  }>('/api/backtests/runs/cost-sensitivity', dto);

  return {
    runId: res.runId,
    baselineMetrics: {
      commissionRate: res.originalCommissionRate,
      slippageBps: res.originalSlippageBps,
      totalReturn: res.baselineTotalReturn,
    },
    results: (res.points ?? []).map((p) => ({
      commissionRate: p.commissionRate,
      stampDutyRate: 0,
      slippageBps: p.slippageBps,
      totalReturn: p.totalReturn,
      annualizedReturn: p.annualizedReturn,
      sharpeRatio: p.sharpeRatio,
      maxDrawdown: p.maxDrawdown,
      totalCost: p.totalCost,
    })),
  };
}

export function createParamSensitivity(dto: ParamSensitivityRequest) {
  return apiClient.post<ParamSensitivityCreateResponse>(
    '/api/backtests/runs/param-sensitivity',
    dto
  );
}

export function getParamSensitivityResult(sweepId: string) {
  return apiClient.post<ParamSensitivityResult>('/api/backtests/runs/param-sensitivity/result', {
    sweepId,
  });
}

// ─── 蒙特卡洛模拟类型 ──────────────────────────────

export type MonteCarloRequest = {
  runId: string;
  numSimulations?: number;
  seed?: number;
};

export type MonteCarloPathPoint = {
  day: number;
  median: number;
  mean: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
};

export type MonteCarloStats = {
  expectedReturn: number;
  expectedVolatility: number;
  var95: number;
  cvar95: number;
  worstDrawdown: number;
  bestReturn: number;
  worstReturn: number;
  probPositive: number;
};

export type MonteCarloResponse = {
  runId: string;
  simulations: number;
  stats: MonteCarloStats;
  paths: MonteCarloPathPoint[];
};

// ─── 蒙特卡洛模拟 API ─────────────────────────────

export function runMonteCarlo(dto: MonteCarloRequest) {
  return apiClient.post<MonteCarloResponse>('/api/backtests/runs/monte-carlo', dto);
}
