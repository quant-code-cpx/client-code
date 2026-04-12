import { apiClient } from './client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventType =
  | 'FORECAST'
  | 'DIVIDEND_EX'
  | 'HOLDER_INCREASE'
  | 'HOLDER_DECREASE'
  | 'SHARE_FLOAT'
  | 'REPURCHASE'
  | 'AUDIT_QUALIFIED'
  | 'DISCLOSURE';

export type EventTypeItem = {
  type: EventType;
  label: string;
  description: string;
};

export type EventsQueryParams = {
  eventType: EventType;
  tsCode?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type EventsQueryResult = {
  total: number;
  items: Record<string, unknown>[];
};

export type EventAnalyzeParams = {
  eventType: EventType;
  tsCode?: string;
  startDate?: string;
  endDate?: string;
  preDays?: number;
  postDays?: number;
  benchmarkCode?: string;
};

export type EventSample = {
  tsCode: string;
  name: string | null;
  eventDate: string;
  car: number;
  arSeries: number[];
};

export type EventAnalyzeResult = {
  eventType: string;
  eventLabel: string;
  sampleCount: number;
  window: string;
  benchmark: string;
  aarSeries: number[];
  caarSeries: number[];
  caar: number;
  tStatistic: number;
  pValue: number;
  topSamples: EventSample[];
  bottomSamples: EventSample[];
};

export type SignalType = 'BUY' | 'SELL' | 'WATCH';
export type SignalRuleStatus = 'ACTIVE' | 'PAUSED' | 'DELETED';

export type SignalRule = {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  eventType: string;
  conditions: Record<string, unknown>;
  signalType: SignalType;
  status: SignalRuleStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateSignalRuleParams = {
  name: string;
  description?: string;
  eventType: EventType;
  conditions?: Record<string, unknown>;
  signalType?: SignalType;
};

export type UpdateSignalRuleParams = {
  name?: string;
  description?: string;
  conditions?: Record<string, unknown>;
  signalType?: SignalType;
  status?: 'ACTIVE' | 'PAUSED';
};

export type SignalRuleListResult = {
  items: SignalRule[];
  total: number;
  page: number;
  pageSize: number;
};

export type SignalScanResult = {
  signalsGenerated: number;
};

export type SignalHistoryParams = {
  page?: number;
  pageSize?: number;
  tsCode?: string;
};

export type SignalHistoryItem = {
  id: number;
  ruleId: number;
  tsCode: string;
  stockName: string | null;
  eventDate: string;
  signalType: SignalType;
  eventDetail: Record<string, unknown>;
  triggeredAt: string;
  rule: {
    name: string;
    eventType: string;
  };
};

export type SignalHistoryResult = {
  items: SignalHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
};

// ── API Functions ─────────────────────────────────────────────────────────────

export function getEventTypes() {
  return apiClient.post<EventTypeItem[]>('/api/event-study/event-types/list', {});
}

export function queryEvents(params: EventsQueryParams) {
  return apiClient.post<EventsQueryResult>('/api/event-study/events', params);
}

export function analyzeEvent(params: EventAnalyzeParams) {
  return apiClient.post<EventAnalyzeResult>('/api/event-study/analyze', params);
}

export function createSignalRule(params: CreateSignalRuleParams) {
  return apiClient.post<SignalRule>('/api/event-study/signal-rules', params);
}

export function listSignalRules(params: { page?: number; pageSize?: number }) {
  return apiClient.post<SignalRuleListResult>('/api/event-study/signal-rules/list', params);
}

export function updateSignalRule(id: number, params: UpdateSignalRuleParams) {
  return apiClient.post<SignalRule>('/api/event-study/signal-rules/update', { id, ...params });
}

export function deleteSignalRule(id: number) {
  return apiClient.post<SignalRule>('/api/event-study/signal-rules/delete', { id });
}

export function scanSignals(params?: { tradeDate?: string }) {
  return apiClient.post<SignalScanResult>('/api/event-study/signal-rules/scan', params ?? {});
}

export function querySignals(params: SignalHistoryParams) {
  return apiClient.post<SignalHistoryResult>('/api/event-study/signals', params);
}
