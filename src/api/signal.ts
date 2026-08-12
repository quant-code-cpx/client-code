import { apiClient } from './client';

// ----------------------------------------------------------------------

export type SignalAction = 'BUY' | 'SELL' | 'HOLD';

export type SignalForwardWindow = 1 | 5 | 20;

export type SignalReturnByWindow = {
  d1?: number | null;
  d5?: number | null;
  d20?: number | null;
};

export type SignalReasonItem = {
  factor: string;
  contribution: number;
};

export type SignalHistoryViewMode = 'raw' | 'position';

export type SignalHistoryAggregateStats = {
  totalSignals: number;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  avgConfidence: number | null;
  accuracy: {
    window: SignalForwardWindow;
    rate: number;
    sampleSize: number;
  } | null;
  avgExcessReturn: {
    window: SignalForwardWindow;
    value: number;
  } | null;
};

export type SignalHistoryDiffSummary = {
  added: number;
  removed: number;
  weightChanged: number;
};

/** 激活信号请求 */
export type ActivateSignalParams = {
  strategyId: string;
  portfolioId?: string;
  universe?: string;
  benchmarkTsCode?: string;
  lookbackDays?: number;
  alertThreshold?: number;
};

/** 停用信号请求 */
export type DeactivateSignalParams = {
  strategyId: string;
};

/** 信号激活项 */
export type SignalActivationItem = {
  id: string;
  strategyId: string;
  strategyName: string;
  portfolioId: string | null;
  isActive: boolean;
  universe: string;
  benchmarkTsCode: string;
  lookbackDays: number;
  alertThreshold: number;
  lastSignalDate: string | null;
  createdAt: string;
  updatedAt: string;
  // ── 重构新增（后端待补，缺失时前端兜底）─────────────
  portfolioName?: string | null;
  lastRunAt?: string | null;
  lastSignalCount?: number | null;
  status?: 'ok' | 'pending' | 'failed' | 'stale';
  lastRunError?: string | null;
};

/** 交易信号条目 */
export type TradingSignalItem = {
  tsCode: string;
  stockName: string;
  action: SignalAction;
  targetWeight: number | null;
  confidence: number | null;
  // ── 重构新增（后端待补，缺失时前端兜底）─────────────
  consecutiveDays?: number;
  isNew?: boolean;
  currentWeight?: number | null;
  estimatedShares?: number | null;
  confidenceMethod?: string | null;
  forwardReturn?: SignalReturnByWindow | null;
  excessReturn?: SignalReturnByWindow | null;
  isFirstOccurrence?: boolean;
  reason?: SignalReasonItem[];
};

/** 最新信号查询参数 */
export type LatestSignalQuery = {
  strategyId?: string;
  tradeDate?: string;
};

/** 信号 diff 项（调仓） */
export type SignalRebalanceItem = {
  tsCode: string;
  stockName: string;
  prevWeight: number;
  newWeight: number;
  delta: number;
};

/** 信号 diff（与上一交易日对比） */
export type SignalDiffFromPrev = {
  prevTradeDate: string;
  added: TradingSignalItem[];
  removed: TradingSignalItem[];
  rebalanced: SignalRebalanceItem[];
};

/** 最新信号响应 */
export type LatestSignalResponse = {
  strategyId: string;
  strategyName: string;
  tradeDate: string;
  signals: TradingSignalItem[];
  generatedAt: string;
  // ── 重构新增（后端待补）─────────────
  status?: 'ok' | 'pending' | 'failed' | 'stale';
  lastRunAt?: string | null;
  lastRunError?: string | null;
  portfolioId?: string | null;
  portfolioName?: string | null;
  portfolioMarketValue?: number | null;
  benchmarkTsCode?: string | null;
  benchmarkName?: string | null;
  diffFromPrev?: SignalDiffFromPrev | null;
};

/** 信号历史查询参数 */
export type SignalHistoryQuery = {
  strategyId: string;
  startDate?: string;
  endDate?: string;
  actions?: SignalAction[];
  stockKeyword?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  forwardWindow?: SignalForwardWindow;
  viewMode?: SignalHistoryViewMode;
  showHold?: boolean;
  page?: number;
  pageSize?: number;
};

/** 信号历史分组 */
export type SignalHistoryGroup = {
  tradeDate: string;
  signalCount: number;
  generatedAt?: string | null;
  diffFromPrev?: SignalHistoryDiffSummary | null;
  signals: TradingSignalItem[];
};

/** 信号历史响应 */
export type SignalHistoryResponse = {
  strategyId: string;
  total: number;
  page: number;
  pageSize: number;
  aggregateStats?: SignalHistoryAggregateStats | null;
  groups: SignalHistoryGroup[];
};

export type SignalHistoryDetailQuery = {
  strategyId: string;
  tradeDate: string;
};

export type SignalHistoryDetailResponse = {
  strategyId: string;
  tradeDate: string;
  generatedAt?: string | null;
  aggregateStats?: SignalHistoryAggregateStats | null;
  diffFromPrev?: SignalHistoryDiffSummary | null;
  signals: TradingSignalItem[];
};

export type SignalHistoryCompareQuery = {
  strategyIds: string[];
  startDate?: string;
  endDate?: string;
  forwardWindow?: SignalForwardWindow;
};

export type SignalHistoryCompareItem = {
  strategyId: string;
  strategyName: string;
  aggregateStats: SignalHistoryAggregateStats | null;
};

export type SignalHistoryCompareResponse = {
  items: SignalHistoryCompareItem[];
};

type SignalHistoryCompareRawResponse = SignalHistoryCompareResponse | SignalHistoryCompareItem[];

// ----------------------------------------------------------------------

export function activateSignal(params: ActivateSignalParams) {
  return apiClient.post<SignalActivationItem>('/api/signal/strategies/activate', params);
}

export function deactivateSignal(params: DeactivateSignalParams) {
  return apiClient.post<SignalActivationItem>('/api/signal/strategies/deactivate', params);
}

export function listSignalActivations() {
  return apiClient.post<SignalActivationItem[]>('/api/signal/strategies/list', {});
}

export function getLatestSignals(params: LatestSignalQuery) {
  return apiClient.post<LatestSignalResponse[]>('/api/signal/latest', params);
}

export function getSignalHistory(params: SignalHistoryQuery) {
  return apiClient.post<SignalHistoryResponse>('/api/signal/history', params);
}

export function compareSignalHistory(params: SignalHistoryCompareQuery) {
  return apiClient
    .post<SignalHistoryCompareRawResponse>('/api/signal/history/compare', params)
    .then((data) => (Array.isArray(data) ? { items: data } : { items: data?.items ?? [] }));
}
