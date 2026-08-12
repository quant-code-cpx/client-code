import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type EventType =
  | 'DISCLOSURE'
  | 'FLOAT'
  | 'DIVIDEND'
  | 'FORECAST'
  | 'IPO'
  | 'CONVERTIBLE'
  | 'SHAREHOLDER';

export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type EventStatus = 'CONFIRMED' | 'EXPECTED' | 'POSTPONED' | 'CANCELLED';

export type CalendarScope = 'ALL' | 'WATCHLIST' | 'PORTFOLIO';

export type EventMarket = 'A' | 'H' | 'B';

export type CalendarEvent = {
  date: string;
  tsCode: string;
  stockName: string | null;
  type: EventType;
  title: string;
  detail: string | Record<string, unknown> | null;
  /** 后端补字段（可选） */
  id?: string;
  subType?: string;
  impactScore?: number | null;
  impactLevel?: ImpactLevel | null;
  metrics?: Record<string, unknown> | null;
  sectorCode?: string | null;
  sectorName?: string | null;
  marketCap?: number | null;
  market?: EventMarket | null;
  time?: string | null;
  daysToEvent?: number | null;
  isInWatchlist?: boolean | null;
  status?: EventStatus | null;
  source?: string | null;
  sourceVendor?: string | null;
  announcementUrl?: string | null;
  announcementId?: string | null;
  tradingDayConflict?: 'HOLIDAY' | 'SUSPENDED' | null;
};

export type CalendarResponse = {
  startDate: string;
  endDate: string;
  totalCount: number;
  events: CalendarEvent[];
  /** 后端补字段（可选） */
  truncated?: boolean;
  currentTradeDate?: string;
  dataAsOf?: string;
  nextCursor?: string | null;
};

export type CalendarListParams = {
  startDate: string;
  endDate: string;
  tsCode?: string;
  types?: EventType[];
  subTypes?: string[];
  scope?: CalendarScope;
  portfolioId?: string;
  watchlistId?: number;
  sectorCodes?: string[];
  marketCapBuckets?: string[];
  impactLevels?: ImpactLevel[];
  keyword?: string;
  sortBy?: 'date' | 'impact' | 'tsCode';
  sortOrder?: 'asc' | 'desc';
  pageSize?: number;
  pageNo?: number;
};

export type CalendarEventDetail = {
  event: CalendarEvent;
  relatedEvents?: CalendarEvent[];
};

export type CalendarHistoryTrendSample = {
  eventDate: string;
  eventTitle: string;
  returns: Record<string, number | null>;
};

export type CalendarHistoryTrend = {
  samples: CalendarHistoryTrendSample[];
  average: Record<string, number | null>;
};

export type PriceAlertRuleType =
  | 'PCT_CHANGE_UP'
  | 'PCT_CHANGE_DOWN'
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'LIMIT_UP'
  | 'LIMIT_DOWN'
  | 'EVENT_DISCLOSURE'
  | 'EVENT_FLOAT'
  | 'EVENT_DIVIDEND'
  | 'EVENT_FORECAST'
  | 'EVENT_IPO'
  | 'EVENT_CONVERTIBLE'
  | 'EVENT_SHAREHOLDER'
  | 'EVENT_ANY';

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

export type PriceAlertRuleListResult = {
  total: number;
  page: number;
  pageSize: number;
  items: PriceAlertRule[];
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

export type AnomalySeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type AnomalyScope = 'ALL' | 'WATCHLIST' | 'PORTFOLIO';

export type AnomalySortBy = 'strength' | 'value' | 'scannedAt' | 'tsCode' | 'anomalyType';

export type AnomalyVolumeSurgeDetail = {
  vol?: number | null;
  avg20Vol?: number | null;
  tradeDateStr?: string | null;
};

export type AnomalyConsecutiveLimitUpDetail = {
  consecutiveDays?: number | null;
  tradeDateStr?: string | null;
};

export type AnomalyLargeNetInflowDetail = {
  buyElgAmount?: number | null;
  sellElgAmount?: number | null;
  netElg?: number | null;
  amount?: number | null;
  tradeDateStr?: string | null;
};

export type AnomalyDetailMap = {
  VOLUME_SURGE: AnomalyVolumeSurgeDetail;
  CONSECUTIVE_LIMIT_UP: AnomalyConsecutiveLimitUpDetail;
  LARGE_NET_INFLOW: AnomalyLargeNetInflowDetail;
};

export type MarketAnomaly = {
  /** 后端实际是 number 类型 */
  id: number;
  /** YYYYMMDD */
  tradeDate: string;
  tsCode: string;
  /** 后端可能为 null（stockBasic 缺失） */
  stockName: string | null;
  anomalyType: AnomalyType;
  value: number;
  threshold: number;
  detail: Record<string, unknown> | null;
  scannedAt: string;

  // ── 后端可选增强字段（未上线前为 undefined） ──
  strengthScore?: number | null;
  severity?: AnomalySeverity | null;
  isNew?: boolean | null;
  continuedDays?: number | null;
  industryCode?: string | null;
  industryName?: string | null;
  isInWatchlist?: boolean | null;
  /** 同股同日命中的其它异动类型 */
  coincidentTypes?: AnomalyType[] | null;
};

export type AnomalyTypeStat = {
  type: AnomalyType;
  count: number;
};

export type AnomalyIndustryStat = {
  industryCode: string;
  industryName: string;
  count: number;
};

export type AnomalyStats = {
  total: number;
  byType: AnomalyTypeStat[];
  byIndustry?: AnomalyIndustryStat[];
  newCount?: number;
  multiTypeStockCount?: number;
  watchlistCount?: number;
  /** 与昨日对比的总数差（正负） */
  totalDeltaVsPrev?: number;
};

export type AnomalyListQuery = {
  /** YYYYMMDD */
  tradeDate?: string;
  /** 单类型（向后兼容） */
  type?: AnomalyType;
  /** 多类型（后端支持后使用） */
  types?: AnomalyType[];
  tsCode?: string;
  tsCodes?: string[];
  keyword?: string;
  scope?: AnomalyScope;
  watchlistId?: number;
  portfolioId?: string;
  industryCodes?: string[];
  conceptCodes?: string[];
  severity?: AnomalySeverity[];
  isNewOnly?: boolean;
  multiTypeOnly?: boolean;
  sortBy?: AnomalySortBy;
  sortOrder?: 'asc' | 'desc';
  /** 1-indexed */
  page?: number;
  pageSize?: number;
};

export type AnomalyListResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: MarketAnomaly[];
  /** 后端可选 — 全量统计；未提供时前端隐藏全量 KPI */
  stats?: AnomalyStats;
  /** 数据基准时间（后端可选） */
  dataAsOf?: string;
};

export type AnomalyScanResult = {
  tradeDate: string;
  volumeSurgeCount: number;
  limitUpCount: number;
  largeInflowCount: number;
  totalNew: number;
  /** 后端可选 — 异步 job 化时返回 */
  scanId?: string;
  errorSummary?: string | null;
};

export type AnomalyScanBody = {
  /** 后端 P1 — 历史交易日重扫 */
  tradeDate?: string;
  /** 后端 P1 — 强制重扫覆盖 */
  force?: boolean;
};

export type AnomalyDetailResponse = {
  anomaly: MarketAnomaly;
  relatedAnomalies?: MarketAnomaly[];
  history?: Array<{
    tradeDate: string;
    anomalyType: AnomalyType;
    value: number;
  }>;
  sourceTables?: string[];
  ruleDescription?: string;
};

export type PriceRuleScanResult = {
  triggered: number;
};

// ----------------------------------------------------------------------
// API 函数
// ----------------------------------------------------------------------

export const alertApi = {
  getCalendar: (params: CalendarListParams, signal?: AbortSignal) =>
    apiClient.post<CalendarResponse>('/api/alert/calendar/list', params, signal),

  getCalendarHistoryTrend: (
    params: { tsCode: string; type: EventType; subType?: string },
    signal?: AbortSignal
  ) => apiClient.post<CalendarHistoryTrend>('/api/alert/calendar/history-trend', params, signal),

  getPriceRules: async () => {
    const result = await apiClient.post<PriceAlertRule[] | PriceAlertRuleListResult>(
      '/api/alert/price-rules/list',
      { page: 1, pageSize: 100 }
    );
    return Array.isArray(result) ? result : (result.items ?? []);
  },

  createPriceRule: (body: CreatePriceRuleBody) =>
    apiClient.post<PriceAlertRule>('/api/alert/price-rules', body),

  updatePriceRule: (id: number, body: UpdatePriceRuleBody) =>
    apiClient.post<PriceAlertRule>('/api/alert/price-rules/update', { id, ...body }),

  deletePriceRule: (id: number) =>
    apiClient.post<{ message: string }>('/api/alert/price-rules/delete', { id }),

  scanPriceRules: () => apiClient.post<PriceRuleScanResult>('/api/alert/price-rules/scan'),

  getAnomalies: (params: AnomalyListQuery, signal?: AbortSignal) =>
    apiClient.post<AnomalyListResponse>('/api/alert/anomalies/list', params, signal),

  getAnomalyDetail: (params: { anomalyId: number }, signal?: AbortSignal) =>
    apiClient.post<AnomalyDetailResponse>('/api/alert/anomalies/detail', params, signal),

  scanAnomalies: (body: AnomalyScanBody = {}) =>
    apiClient.post<AnomalyScanResult>('/api/alert/anomalies/scan', body),
};

// ── 涨跌停明细 (limit_list_d) ─────────────────────────────────

/** 连板/连跌状态 — 后端 P0 字段 BE-2 */
export type LimitStreakStatus =
  | 'FIRST_LIMIT' // 首板
  | 'CONSECUTIVE' // 续板
  | 'PROMOTE' // 晋级（昨日 N 板 → 今日 N+1 板）
  | 'BREAK' // 断板（昨日涨停今日未涨停）
  | 'FLUSH'; // 炸板

/** 涨跌停类型。BROKEN = 触及涨停后开板（炸板）。 */
export type LimitType = 'UP' | 'DOWN' | 'BROKEN';

/** 封板形态 — 后端 P0 字段 BE-4 */
export type LimitSealPattern =
  | 'ONE_LINE' // 一字板
  | 'EARLY_SEAL' // 早封
  | 'LATE_SEAL' // 晚封
  | 'REOPENED'; // 回封

export type LimitListItem = {
  tradeDate: string;
  tsCode: string;
  stockName: string;
  /** UP = 涨停, DOWN = 跌停, BROKEN = 炸板 */
  limitType: LimitType;
  close: number;
  pctChg: number;
  amount?: number | null;
  floatMv?: number | null;
  totalMv?: number | null;
  turnoverRatio?: number | null;
  /** 封单量（手） */
  sealVolume?: number | null;
  /** 封单额（万元） */
  sealAmount?: number | null;
  /** 连板/连跌天数。后端 BE-6：UP/DOWN 均生效。`consecutiveDays` 为兼容旧字段。 */
  consecutiveDays?: number | null;
  streakDays?: number | null;
  /** 首次封板时间 */
  firstSealTime: string | null;
  /** 最后封板时间 */
  lastSealTime: string | null;
  /** 封板次数（开板回封计数） */
  sealCount?: number | null;

  // ── 后端 P0 增强字段（未上线前为 undefined） ──────────────
  /** 行业（来源 stock_basic.industry）— BE-1 */
  industry?: string | null;
  /** 概念板块成员（多个）— BE-1 */
  concepts?: string[] | null;
  /** 连板状态枚举 — BE-2 */
  streakStatus?: LimitStreakStatus | null;
  /** 涨跌停板上限（5/10/20/30）— BE-3 */
  pctChgLimit?: number | null;
  /** 封板形态 — BE-4 */
  sealPattern?: LimitSealPattern | null;
  /** 封单额 / 流通市值（0~1）— BE-5 */
  sealRatio?: number | null;

  // ── 后端 P1 字段 ──────────────
  /** 近 60 日涨停次数 — BE-10 */
  recentLimitCount60d?: number | null;
  /** 开板次数 — BE-11 */
  openCount?: number | null;
  /** 累计开板时长（秒）— BE-11 */
  openDuration?: number | null;
  firstTime?: string | null;
  lastTime?: string | null;
  openTimes?: number | null;
  fdPercent?: number | null;
  upStat?: string | null;
};

type RawLimitType = LimitType | 'OTHER';

type RawLimitListItem = Omit<LimitListItem, 'limitType'> & {
  limitType: RawLimitType;
};

/** 列表响应 meta（后端 P0 字段 BE-7） */
export type LimitListMeta = {
  /** 实际数据归属交易日 */
  actualDate?: string;
  /** 用户请求日期 */
  requestedDate?: string;
  /** 是否非交易日 */
  isHoliday?: boolean;
};

export type LimitListResponse = {
  items: LimitListItem[];
  meta?: LimitListMeta;
};

type RawLimitListResponse = Omit<LimitListResponse, 'items'> & {
  items: RawLimitListItem[];
};

export type LimitListQuery = {
  trade_date?: string;
  limit_type?: LimitType;
  min_consecutive?: number;
  /** 行业过滤（前端 P0；后端 BE-1 上线后生效） */
  industry?: string;
  /** 概念过滤 */
  concept?: string;
  /** 流通市值分桶 */
  mv_bucket?: 'UNDER_50' | '50_200' | '200_500' | '500_1000' | 'ABOVE_1000';
  /** 板高度过滤 */
  pct_chg_limit?: 5 | 10 | 20 | 30;
  /** 封板形态过滤 */
  seal_pattern?: LimitSealPattern;
};

function compactObject<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== '')
  ) as Partial<T>;
}

function toLimitListBody(query?: LimitListQuery) {
  return compactObject({
    tradeDate: query?.trade_date,
    limitType: query?.limit_type,
    minStreak: query?.min_consecutive,
    industry: query?.industry,
  });
}

function normalizeLimitType(type: RawLimitType): LimitType {
  return type === 'OTHER' ? 'BROKEN' : type;
}

function normalizeLimitListItem(item: RawLimitListItem): LimitListItem {
  return { ...item, limitType: normalizeLimitType(item.limitType) };
}

/**
 * 拉取涨跌停明细。
 *
 * 兼容老后端：旧响应是 `LimitListItem[]`，新响应是 `{ items, meta }`。
 * 此处统一归一为 `LimitListResponse`。
 */
export async function fetchLimitList(query?: LimitListQuery): Promise<LimitListResponse> {
  const raw = await apiClient.post<RawLimitListItem[] | RawLimitListResponse>(
    '/api/alert/limit-list',
    toLimitListBody(query)
  );
  if (Array.isArray(raw)) return { items: raw.map(normalizeLimitListItem) };
  return { ...raw, items: raw.items.map(normalizeLimitListItem) };
}

// ── 多日汇总（后端 BE-8） ───────────────────────────────────────

export type LimitSummaryDay = {
  /** YYYYMMDD */
  date: string;
  limitUp: number;
  limitDown: number;
  /** 当日最高板高度 */
  maxStreak: number;
  /** 封板率（封住数 / 触板数） */
  sealRate: number | null;
  /** 晋级率（昨日 N 板今日续板 / 昨日 N 板总数） */
  promoteRate: number | null;
  /** 炸板率 */
  failRate: number | null;
};

export type LimitSummaryQuery = {
  trade_date?: string;
  /** 默认 5 */
  range?: number;
};

export function fetchLimitSummary(query: LimitSummaryQuery) {
  return apiClient.post<LimitSummaryDay[]>(
    '/api/alert/limit-summary',
    compactObject({ tradeDate: query.trade_date, range: query.range })
  );
}

// ── 次日表现矩阵（后端 BE-9） ───────────────────────────────────

export type LimitNextDayBucket =
  | 'LIMIT_UP'
  | 'ABOVE_5'
  | 'IN_5'
  | 'BELOW_0'
  | 'BELOW_5'
  | 'LIMIT_DOWN';

export type LimitNextDayRow = {
  /** 昨日板高度 */
  prevStreak: number;
  /** 各桶票数 */
  today: Record<LimitNextDayBucket, number>;
  /** 有效样本数 */
  total: number;
  /** 平均次日涨幅（百分比） */
  avgNextDayPct: number | null;
};

export type LimitNextDayResponse = {
  /** 兼容旧字段：优先为 nextTradeDate。 */
  date: string;
  /** 昨日封板池日期 */
  baseDate: string | null;
  /** 次一交易日 */
  nextTradeDate: string | null;
  total: number;
  avgPctChg: number | null;
  upRatio: number | null;
  rows: LimitNextDayRow[];
};

export type LimitNextDayQuery = {
  trade_date?: string;
  limit_type?: LimitType;
  min_consecutive?: number;
};

export type LimitNextDayPerfItem = LimitListItem & {
  nextClose: number | null;
  nextPctChg: number | null;
};

type LimitNextDayRawItem = Omit<LimitNextDayPerfItem, 'limitType'> & {
  limitType: RawLimitType;
};

type LimitNextDayRawResponse = {
  meta?: LimitListMeta;
  nextTradeDate: string | null;
  total: number;
  avgPctChg: number | null;
  upRatio: number | null;
  items: LimitNextDayRawItem[];
};

type LimitNextDayLegacyResponse = Partial<Omit<LimitNextDayResponse, 'rows'>> & {
  rows: LimitNextDayRow[];
};

function normalizeLimitNextDayItem(item: LimitNextDayRawItem): LimitNextDayPerfItem {
  return { ...item, limitType: normalizeLimitType(item.limitType) };
}

const EMPTY_BUCKETS: Record<LimitNextDayBucket, number> = {
  IN_5: 0,
  ABOVE_5: 0,
  BELOW_0: 0,
  BELOW_5: 0,
  LIMIT_UP: 0,
  LIMIT_DOWN: 0,
};

const VALID_LIMIT_PCTS = new Set([5, 10, 20, 30]);

function resolveLimitPct(item: Pick<LimitListItem, 'tsCode' | 'stockName' | 'pctChgLimit'>) {
  const pctChgLimit = Math.abs(item.pctChgLimit ?? Number.NaN);
  if (VALID_LIMIT_PCTS.has(pctChgLimit)) return pctChgLimit;

  const code = item.tsCode.split('.')[0] ?? '';
  const name = item.stockName.toUpperCase();
  if (name.includes('ST')) return 5;
  if (code.startsWith('300') || code.startsWith('301') || code.startsWith('688')) return 20;
  if (code.startsWith('8') || code.startsWith('4') || code.startsWith('92')) return 30;
  return 10;
}

function resolveNextDayBucket(item: LimitNextDayPerfItem): LimitNextDayBucket {
  const pct = Number(item.nextPctChg ?? 0);
  const limitPct = resolveLimitPct(item);
  const tolerance = 0.1;

  if (pct >= limitPct - tolerance) return 'LIMIT_UP';
  if (pct <= -limitPct + tolerance) return 'LIMIT_DOWN';
  if (pct >= 5) return 'ABOVE_5';
  if (pct >= 0) return 'IN_5';
  if (pct > -5) return 'BELOW_0';
  return 'BELOW_5';
}

function countBuckets(today: Record<LimitNextDayBucket, number>) {
  return Object.values(today).reduce((sum, count) => sum + count, 0);
}

function normalizeLimitNextDayResponse(
  raw: LimitNextDayRawResponse | LimitNextDayLegacyResponse
): LimitNextDayResponse {
  if ('rows' in raw) {
    const rows = raw.rows.map((row) => ({
      ...row,
      total: row.total ?? countBuckets(row.today),
    }));

    return {
      date: raw.date ?? raw.nextTradeDate ?? '',
      rows,
      total: raw.total ?? rows.reduce((sum, row) => sum + row.total, 0),
      upRatio: raw.upRatio ?? null,
      baseDate: raw.baseDate ?? null,
      avgPctChg: raw.avgPctChg ?? null,
      nextTradeDate: raw.nextTradeDate ?? raw.date ?? null,
    };
  }

  const grouped = new Map<
    number,
    { today: Record<LimitNextDayBucket, number>; total: number; pctSum: number }
  >();

  raw.items.map(normalizeLimitNextDayItem).forEach((item) => {
    if (item.nextPctChg == null) return;

    const prevStreak = Math.max(1, item.streakDays ?? item.consecutiveDays ?? 1);
    const bucket = resolveNextDayBucket(item);
    const current = grouped.get(prevStreak) ?? {
      today: { ...EMPTY_BUCKETS },
      total: 0,
      pctSum: 0,
    };

    current.today[bucket] += 1;
    current.total += 1;
    current.pctSum += Number(item.nextPctChg);
    grouped.set(prevStreak, current);
  });

  const rows = Array.from(grouped.entries())
    .sort(([a], [b]) => a - b)
    .map(([prevStreak, row]) => ({
      prevStreak,
      today: row.today,
      total: row.total,
      avgNextDayPct: row.total > 0 ? Math.round((row.pctSum / row.total) * 10000) / 10000 : null,
    }));

  return {
    rows,
    total: raw.total,
    upRatio: raw.upRatio,
    avgPctChg: raw.avgPctChg,
    date: raw.nextTradeDate ?? raw.meta?.actualDate ?? '',
    baseDate: raw.meta?.actualDate ?? null,
    nextTradeDate: raw.nextTradeDate,
  };
}

export async function fetchLimitNextDayPerf(params: LimitNextDayQuery) {
  const raw = await apiClient.post<LimitNextDayRawResponse | LimitNextDayLegacyResponse>(
    '/api/alert/limit-next-day-perf',
    compactObject({
      tradeDate: params.trade_date,
      limitType: params.limit_type,
      minStreak: params.min_consecutive,
    })
  );

  return normalizeLimitNextDayResponse(raw);
}
