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

export type MarketCapBucket = 'small' | 'mid' | 'large';

export type EventFilters = {
  industry?: string;
  marketCapBucket?: MarketCapBucket;
  excludeSt?: boolean;
  minListingDays?: number;
};

export type EventsQueryParams = {
  eventType: EventType;
  tsCode?: string;
  startDate?: string;
  endDate?: string;
  industry?: string;
  marketCapBucket?: MarketCapBucket;
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
  filters?: EventFilters;
  clusterWindow?: number;
};

export type EventSample = {
  tsCode: string;
  name: string | null;
  eventDate: string;
  car: number;
  arSeries: number[];
};

export type SignificantSegment = {
  from: number;
  to: number;
  direction: 'pos' | 'neg';
};

export type EventAnalyzeResult = {
  eventType: string;
  eventLabel: string;
  sampleCount: number;
  window: string;
  benchmark: string;
  aarSeries: number[];
  caarSeries: number[];
  /** AAR 同期标准差序列，用于 ±2σ 阴影；可为空 */
  aarStdSeries?: number[];
  /** 显著区段（p<0.05） */
  significantSegments?: SignificantSegment[];
  caar: number;
  tStatistic: number;
  pValue: number;
  /** 显著样本占比（CAR 在 ±2σ 之外）；可为空时前端兜底计算 */
  significantSampleRatio?: number;
  topSamples: EventSample[];
  bottomSamples: EventSample[];
};

export type SegmentGroupBy = 'industry' | 'marketCapBucket' | 'stFlag';

export type AnalyzeBySegmentParams = EventAnalyzeParams & {
  groupBy: SegmentGroupBy;
};

export type SegmentItem = {
  key: string;
  label: string;
  sampleCount: number;
  caar: number;
  tStatistic: number;
  pValue: number;
};

export type AnalyzeBySegmentResult = {
  groupBy: SegmentGroupBy;
  segments: SegmentItem[];
};

export type EventCalendarParams = {
  startDate: string;
  endDate: string;
  eventTypes?: EventType[];
};

export type EventCalendarCell = {
  date: string;
  eventType: EventType;
  count: number;
  significantCount: number;
};

export type EventCalendarResult = {
  cells: EventCalendarCell[];
};

export type EventSchemaField = {
  name: string;
  label: string;
  type: 'number' | 'date' | 'enum' | 'string';
  unit?: string;
  enumValues?: Array<{ value: string; label: string }>;
  hint?: string;
};

export type EventSchemaResult = {
  eventType: EventType;
  fields: EventSchemaField[];
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

export type SignalRuleStats = {
  hitCount30d: number;
  hitRate: number;
  avgCar: number;
  lastTriggered: string | null;
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

export type SignalRulePreviewParams = {
  eventType: EventType;
  conditions: Record<string, unknown>;
  signalType: SignalType;
  lookbackDays?: number;
};

export type SignalRulePreviewResult = {
  matchCount: number;
  distribution: Record<string, number>;
  samples: Array<{ tsCode: string; name: string | null; eventDate: string }>;
};

export type SignalRuleBacktestParams = {
  startDate: string;
  endDate: string;
};

export type SignalRuleBacktestResult = {
  totalHits: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  carStats: { mean: number; median: number; std: number; p95: number };
};

export type ScanJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type ScanJobResult = {
  jobId: string;
  status: ScanJobStatus;
  progress: { processed: number; total: number };
  signalsGenerated?: number;
  errorMessage?: string;
};

export type SignalHistoryParams = {
  page?: number;
  pageSize?: number;
  tsCode?: string;
  ruleId?: number;
  signalType?: SignalType;
  startDate?: string;
  endDate?: string;
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

export type AnalysisPlan = {
  id: number;
  name: string;
  description: string | null;
  params: EventAnalyzeParams;
  ownerId: number;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateAnalysisPlanParams = {
  name: string;
  description?: string;
  params: EventAnalyzeParams;
};

export type AnalysisPlanListResult = {
  items: AnalysisPlan[];
  total: number;
};

// ── API Functions ─────────────────────────────────────────────────────────────

export function getEventTypes() {
  return apiClient.post<EventTypeItem[]>('/api/event-study/event-types/list', {});
}

export function getEventSchema(eventType: EventType) {
  return apiClient.post<EventSchemaResult>('/api/event-study/event-schemas/get', { eventType });
}

export function getEventCalendar(params: EventCalendarParams) {
  return apiClient.post<EventCalendarResult>('/api/event-study/events/calendar', params);
}

export function queryEvents(params: EventsQueryParams) {
  return apiClient.post<EventsQueryResult>('/api/event-study/events', params);
}

export function analyzeEvent(params: EventAnalyzeParams) {
  return apiClient.post<EventAnalyzeResult>('/api/event-study/analyze', params);
}

export function analyzeBySegment(params: AnalyzeBySegmentParams) {
  return apiClient.post<AnalyzeBySegmentResult>('/api/event-study/analyze/by-segment', params);
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

export function getSignalRuleStats(id: number) {
  return apiClient.post<SignalRuleStats>('/api/event-study/signal-rules/stats', { id });
}

export function previewSignalRule(params: SignalRulePreviewParams) {
  return apiClient.post<SignalRulePreviewResult>(
    '/api/event-study/signal-rules/preview',
    params
  );
}

export function backtestSignalRule(id: number, params: SignalRuleBacktestParams) {
  return apiClient.post<SignalRuleBacktestResult>('/api/event-study/signal-rules/backtest', {
    id,
    ...params,
  });
}

export function scanSignals(params?: { tradeDate?: string }) {
  return apiClient.post<SignalScanResult>('/api/event-study/signal-rules/scan', params ?? {});
}

export function scanSignalsAsync(params?: { tradeDate?: string }) {
  return apiClient.post<{ jobId: string; status: ScanJobStatus }>(
    '/api/event-study/signal-rules/scan/async',
    params ?? {}
  );
}

export function getScanJob(jobId: string) {
  return apiClient.post<ScanJobResult>('/api/event-study/signal-rules/scan/jobs/get', {
    jobId,
  });
}

export function querySignals(params: SignalHistoryParams) {
  return apiClient.post<SignalHistoryResult>('/api/event-study/signals', params);
}

export function listAnalysisPlans() {
  return apiClient.post<AnalysisPlanListResult>('/api/event-study/analyses/list', {});
}

export function createAnalysisPlan(params: CreateAnalysisPlanParams) {
  return apiClient.post<AnalysisPlan>('/api/event-study/analyses/create', params);
}

export function deleteAnalysisPlan(id: number) {
  return apiClient.post<{ success: boolean }>('/api/event-study/analyses/delete', { id });
}

