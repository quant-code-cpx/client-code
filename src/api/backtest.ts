import { apiClient } from './client';

// ─── 模板 ────────────────────────────────────────

export type StrategyTemplate = {
  id: 'MA_CROSS_SINGLE' | 'SCREENING_ROTATION' | 'FACTOR_RANKING' | 'CUSTOM_POOL_REBALANCE';
  name: string;
  description: string;
  category: 'TECHNICAL' | 'SCREENING' | 'FACTOR' | 'CUSTOM';
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
};

export type ValidateBacktestRunResponse = {
  isValid: boolean;
  warnings: string[];
  errors: string[];
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
};

export type CreateBacktestRunResponse = {
  runId: string;
  jobId: string;
  status: 'QUEUED';
};

// ─── 列表 / 详情 ─────────────────────────────────

export type BacktestRunListItem = {
  runId: string;
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
  completedAt: string | null;
};

export type BacktestRunListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: BacktestRunListItem[];
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

export function listRuns(query: {
  page?: number;
  pageSize?: number;
  status?: string;
  strategyType?: string;
  keyword?: string;
}) {
  return apiClient.post<BacktestRunListResponse>('/api/backtests/runs/list', query);
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
  status: string;
  fullStartDate: string;
  fullEndDate: string;
  oosSharpeRatio: number | null;
  oosAnnualizedReturn: number | null;
  oosMaxDrawdown: number | null;
  progress: number;
  createdAt: string;
  completedAt: string | null;
};

export type WalkForwardRunListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: WalkForwardRunSummary[];
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
};

export type WalkForwardRunDetail = {
  wfRunId: string;
  jobId?: string;
  name: string | null;
  baseStrategyType: string;
  status: string;
  progress: number;
  failedReason: string | null;
  fullStartDate: string;
  fullEndDate: string;
  inSampleDays: number;
  outOfSampleDays: number;
  stepDays: number;
  optimizeMetric: string;
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
  windowIndex: number;
};

export type WalkForwardEquityResponse = {
  points: WalkForwardEquityPoint[];
};

// ─── Walk-Forward API ─────────────────────────────

export function createWalkForwardRun(query: CreateWalkForwardRunQuery) {
  return apiClient.post<CreateWalkForwardRunResponse>('/api/backtests/walk-forward/runs', query);
}

export function listWalkForwardRuns(query: { page?: number; pageSize?: number }) {
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

// ─── 多策略对比类型 ────────────────────────────────

export type ComparisonStrategyItem = {
  label?: string;
  strategyType: StrategyTypeValue;
  strategyConfig: Record<string, unknown>;
  rebalanceFrequency?: string;
};

export type CreateComparisonQuery = {
  name?: string;
  strategies: ComparisonStrategyItem[]; // 2–10 个策略
  startDate: string; // YYYYMMDD
  endDate: string;
  benchmarkTsCode?: string;
  universe?: string;
  initialCapital: number;
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
};

export type ComparisonGroupDetail = {
  groupId: string;
  name: string | null;
  status: string;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  metrics: ComparisonMetricsRow[];
  createdAt: string;
  completedAt: string | null;
};

export type ComparisonEquitySeries = {
  runId: string;
  label: string | null;
  points: Array<{ tradeDate: string; nav: number }>;
};

export type ComparisonEquityResponse = {
  series: ComparisonEquitySeries[];
};

// ─── 多策略对比 API ────────────────────────────────

export function createComparison(query: CreateComparisonQuery) {
  return apiClient.post<CreateComparisonResponse>('/api/backtests/comparisons', query);
}

export function getComparisonDetail(groupId: string) {
  return apiClient.post<ComparisonGroupDetail>('/api/backtests/comparisons/detail', { groupId });
}

export function getComparisonEquity(groupId: string) {
  return apiClient.post<ComparisonEquityResponse>('/api/backtests/comparisons/equity', { groupId });
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
