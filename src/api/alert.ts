import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type EventType = 'DISCLOSURE' | 'FLOAT' | 'DIVIDEND' | 'FORECAST';

export type CalendarEvent = {
  date: string;
  tsCode: string;
  stockName: string;
  type: EventType;
  title: string;
  detail: string;
};

export type CalendarResponse = {
  startDate: string;
  endDate: string;
  totalCount: number;
  events: CalendarEvent[];
};

export type PriceAlertRuleType =
  | 'PCT_CHANGE_UP'
  | 'PCT_CHANGE_DOWN'
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'LIMIT_UP'
  | 'LIMIT_DOWN';

export type PriceAlertRuleStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';

export type PriceAlertRule = {
  id: number;
  userId: number;
  tsCode: string | null;
  stockName: string | null;
  watchlistId: number | null;
  portfolioId: string | null;
  sourceName: string | null;
  ruleType: PriceAlertRuleType;
  threshold: number | null;
  memo: string | null;
  status: PriceAlertRuleStatus;
  triggerCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePriceRuleBody = {
  /** 单股预警时必填；使用 watchlistId 或 portfolioId 时可省略 */
  tsCode?: string;
  ruleType: PriceAlertRuleType;
  threshold?: number;
  memo?: string;
  /** 关联自选股组 — 对该组所有成员股应用规则 */
  watchlistId?: number;
  /** 关联组合 — 对该组合所有持仓股应用规则 */
  portfolioId?: string;
};

export type UpdatePriceRuleBody = {
  tsCode?: string;
  ruleType?: PriceAlertRuleType;
  threshold?: number | null;
  memo?: string;
  status?: PriceAlertRuleStatus;
};

export type AnomalyType = 'VOLUME_SURGE' | 'CONSECUTIVE_LIMIT_UP' | 'LARGE_NET_INFLOW';

export type MarketAnomaly = {
  id: string;
  tradeDate: string;
  tsCode: string;
  stockName: string;
  anomalyType: AnomalyType;
  value: number;
  threshold: number;
  detail: Record<string, unknown>;
  scannedAt: string;
};

export type AnomalyListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: MarketAnomaly[];
};

export type AnomalyScanResult = {
  tradeDate: string;
  volumeSurgeCount: number;
  limitUpCount: number;
  largeInflowCount: number;
  totalNew: number;
};

export type PriceRuleScanResult = {
  triggered: number;
};

// ----------------------------------------------------------------------
// API 函数
// ----------------------------------------------------------------------

export const alertApi = {
  getCalendar: (params: {
    startDate: string;
    endDate: string;
    tsCode?: string;
    types?: EventType[];
  }) => apiClient.post<CalendarResponse>('/api/alert/calendar/list', params),

  getPriceRules: () => apiClient.post<PriceAlertRule[]>('/api/alert/price-rules/list', {}),

  createPriceRule: (body: CreatePriceRuleBody) =>
    apiClient.post<PriceAlertRule>('/api/alert/price-rules', body),

  updatePriceRule: (id: number, body: UpdatePriceRuleBody) =>
    apiClient.post<PriceAlertRule>('/api/alert/price-rules/update', { id, ...body }),

  deletePriceRule: (id: number) =>
    apiClient.post<{ message: string }>('/api/alert/price-rules/delete', { id }),

  scanPriceRules: () => apiClient.post<PriceRuleScanResult>('/api/alert/price-rules/scan'),

  getAnomalies: (params: {
    tradeDate?: string;
    type?: AnomalyType;
    tsCode?: string;
    page?: number;
    pageSize?: number;
  }) => apiClient.post<AnomalyListResponse>('/api/alert/anomalies/list', params),

  scanAnomalies: () => apiClient.post<AnomalyScanResult>('/api/alert/anomalies/scan'),
};
