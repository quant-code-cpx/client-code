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
