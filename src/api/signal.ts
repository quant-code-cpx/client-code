import { apiClient } from './client';

// ----------------------------------------------------------------------

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
};

/** 交易信号条目 */
export type TradingSignalItem = {
  tsCode: string;
  stockName: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  targetWeight: number | null;
  confidence: number | null;
};

/** 最新信号查询参数 */
export type LatestSignalQuery = {
  strategyId?: string;
  tradeDate?: string;
};

/** 最新信号响应 */
export type LatestSignalResponse = {
  strategyId: string;
  strategyName: string;
  tradeDate: string;
  signals: TradingSignalItem[];
  generatedAt: string;
};

/** 信号历史查询参数 */
export type SignalHistoryQuery = {
  strategyId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

/** 信号历史分组 */
export type SignalHistoryGroup = {
  tradeDate: string;
  signalCount: number;
  signals: TradingSignalItem[];
};

/** 信号历史响应 */
export type SignalHistoryResponse = {
  strategyId: string;
  total: number;
  page: number;
  pageSize: number;
  groups: SignalHistoryGroup[];
};

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
