import { apiClient } from './client';

const inFlightPostRequests = new Map<string, Promise<unknown>>();

function normalizePayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizePayload);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalizePayload(item)])
    );
  }
  return value;
}

function postOnce<T>(url: string, body?: unknown): Promise<T> {
  const normalizedBody = normalizePayload(body ?? {});
  const cacheKey = `${url}:${JSON.stringify(normalizedBody)}`;
  const existing = inFlightPostRequests.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const request = apiClient
    .post<T>(url, normalizedBody)
    .finally(() => inFlightPostRequests.delete(cacheKey));
  inFlightPostRequests.set(cacheKey, request);
  return request;
}

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type MarketQueryBase = {
  /** YYYYMMDD 格式，如 '20240101'；不传则后端自动取最新交易日 */
  trade_date?: string;
};

export type IndexQuoteItem = {
  tsCode: string;
  tradeDate: string;
  close: number | null;
  preClose: number | null;
  change: number | null;
  pctChg: number | null;
  /** 成交量（手） */
  vol: number | null;
  /** 成交额（千元） */
  amount: number | null;
  baseDate: string | null;
  basePoint: number | null;
};

export type IndexTrendQuery = {
  ts_code?: string;
  period?: '1m' | '3m' | '6m' | '1y' | '3y';
};

export type IndexTrendItem = {
  tradeDate: string;
  close: number;
  pctChg: number;
  /** 成交量（手） */
  vol: number;
  /** 成交额（千元） */
  amount: number;
};

export type IndexTrendResult = {
  tsCode: string;
  name: string;
  period: string;
  data: IndexTrendItem[];
};

export type SentimentResult = {
  tradeDate: string;
  total: number;
  bigRise: number;
  rise: number;
  flat: number;
  fall: number;
  bigFall: number;
};

export type ChangeDistributionResult = {
  tradeDate: string;
  limitUp: number;
  limitDown: number;
  distribution: Array<{ label: string; count: number }>;
};

export type SentimentTrendItem = {
  tradeDate: string;
  rise: number;
  flat: number;
  fall: number;
  limitUp: number;
  limitDown: number;
};

export type SectorRankingItem = {
  tsCode: string;
  name: string;
  pctChange: number;
  netAmount: number;
  netAmountRate: number;
};

export type VolumeOverviewItem = {
  tradeDate: string;
  /** 全A股合计成交额（亿元） */
  totalAmount: number;
  /** 上证指数成交额（亿元） */
  shAmount: number;
  /** 深证成指成交额（亿元） */
  szAmount: number;
};

export type ValuationResult = {
  tradeDate: string | null;
  peTtmMedian: number | null;
  pbMedian: number | null;
  peTtmPercentile: { oneYear: number | null; threeYear: number | null; fiveYear: number | null };
  pbPercentile: { oneYear: number | null; threeYear: number | null; fiveYear: number | null };
};

export type ValuationTrendItem = {
  tradeDate: string;
  peTtmMedian: number;
  pbMedian: number;
};

// ----------------------------------------------------------------------
// API 调用函数
// ----------------------------------------------------------------------

export function fetchIndexQuote(query?: MarketQueryBase & { ts_codes?: string[] }) {
  return postOnce<IndexQuoteItem[]>('/api/market/index-quote', query ?? {});
}

export function fetchIndexTrend(query?: IndexTrendQuery) {
  return postOnce<IndexTrendResult>('/api/market/index-trend', query ?? {});
}

export function fetchSentiment(query?: MarketQueryBase) {
  return postOnce<SentimentResult>('/api/market/sentiment', query ?? {});
}

export function fetchChangeDistribution(query?: MarketQueryBase) {
  return postOnce<ChangeDistributionResult>('/api/market/change-distribution', query ?? {});
}

export function fetchSentimentTrend(query?: MarketQueryBase & { days?: number }) {
  return postOnce<{ data: SentimentTrendItem[] }>('/api/market/sentiment-trend', query ?? {});
}

export function fetchSectorRanking(query?: MarketQueryBase & { sort_by?: string; limit?: number }) {
  return postOnce<{ tradeDate: string; sectors: SectorRankingItem[] }>(
    '/api/market/sector-ranking',
    query ?? {}
  );
}

// ── Sector Top-Bottom (new dedicated endpoint) ─────────────────

export type SectorTopBottomItem = {
  tsCode: string;
  name: string | null;
  /** 涨跌幅 (%) */
  pctChange: number | null;
  /** 主力净流入 (元) */
  netAmount: number | null;
};

export type SectorTopBottomResult = {
  tradeDate: string;
  /** 涨幅 Top N（genuine positive pct_change） */
  pctGainers: SectorTopBottomItem[];
  /** 跌幅 Top N（genuine negative pct_change，最负在前） */
  pctLosers: SectorTopBottomItem[];
  /** 净流入 Top N（genuine positive net_amount） */
  flowGainers: SectorTopBottomItem[];
  /** 净流出 Top N（genuine negative net_amount，最负在前） */
  flowLosers: SectorTopBottomItem[];
  gainersCount: number;
  losersCount: number;
  flatCount: number;
  totalCount: number;
};

export function fetchSectorTopBottom(query?: MarketQueryBase & { top_n?: number }) {
  return postOnce<SectorTopBottomResult>('/api/market/sector-top-bottom', query ?? {});
}

export function fetchVolumeOverview(query?: MarketQueryBase & { days?: number }) {
  return postOnce<{ data: VolumeOverviewItem[] }>('/api/market/volume-overview', query ?? {});
}

export function fetchValuation(query?: MarketQueryBase) {
  return postOnce<ValuationResult>('/api/market/valuation', query ?? {});
}

export function fetchValuationTrend(query?: { period?: string }) {
  return postOnce<{ period: string; data: ValuationTrendItem[] }>(
    '/api/market/valuation-trend',
    query ?? {}
  );
}

// ----------------------------------------------------------------------
// 资金动态 类型定义
// ----------------------------------------------------------------------

/**
 * 单一层级（超大/大/中/小单）或汇总组（主力/散户）的资金流向。
 * buyAmount / sellAmount 是按订单规模分类的买方/卖方成交额，非「主动买入/卖出」。
 */
export type TierFlow = {
  /** 买方订单成交额（元，按订单规模分类） */
  buyAmount: number | null;
  /** 卖方订单成交额（元，按订单规模分类） */
  sellAmount: number | null;
  /** 净流入 = 买入 - 卖出（元，正=净流入，负=净流出） */
  netAmount: number | null;
  /** 买入额 / 全市场总成交（%） */
  buyRate: number | null;
  /** 卖出额 / 全市场总成交（%） */
  sellRate: number | null;
  /** 净流入 / 全市场总成交（%） */
  netRate: number | null;
};

export type MarketMoneyFlowDetail = {
  tradeDate: string;
  closeSh: number | null;
  pctChangeSh: number | null;
  closeSz: number | null;
  pctChangeSz: number | null;
  /** 全市场单边总成交金额（元）= 四层买入之和 */
  totalAmount: number | null;
  /** 逐笔资金净流入汇总（元，按逐笔成交方向汇总，不等同于主力资金） */
  netMfAmount: number | null;
  /** 主力资金（超大单 + 大单）汇总 */
  main: TierFlow;
  /** 散户资金（中单 + 小单）汇总 */
  retail: TierFlow;
  /** 超大单（单笔成交 ≥ 100万元） */
  elg: TierFlow;
  /** 大单（单笔 20~100万元） */
  lg: TierFlow;
  /** 中单（单笔 4~20万元） */
  md: TierFlow;
  /** 小单（单笔 < 4万元） */
  sm: TierFlow;
};

export type MoneyFlowTrendItem = {
  tradeDate: string;
  /** 当日净流入（元） */
  netAmount: number;
  /** 累计净流入（元） */
  cumulativeNet: number;
  /** 超大单净流入（元） */
  buyElgAmount: number;
  /** 大单净流入（元） */
  buyLgAmount: number;
  /** 中单净流入（元） */
  buyMdAmount: number;
  /** 小单净流入（元） */
  buySmAmount: number;
};

export type SectorFlowRankingItem = {
  tsCode: string;
  name: string;
  /** 板块涨跌幅 % */
  pctChange: number;
  close: number;
  /** 净流入（元） */
  netAmount: number;
  /** 净流入率 % */
  netAmountRate: number;
  /** 超大单净流入（元） */
  buyElgAmount: number;
  /** 大单净流入（元） */
  buyLgAmount: number;
  /** 中单净流入（元） */
  buyMdAmount: number;
  /** 小单净流入（元） */
  buySmAmount: number;
};

export type SectorFlowTrendItem = {
  tradeDate: string;
  /** 板块涨跌幅 % */
  pctChange: number;
  /** 当日净流入（元） */
  netAmount: number;
  /** 累计净流入（元） */
  cumulativeNet: number;
};

export type HsgtTrendItem = {
  tradeDate: string;
  /** 北向当日成交额（百万元，非净流入） */
  northMoney: number | null;
  /** 南向当日成交额（百万元，非净流入） */
  southMoney: number | null;
  /** 沪股通当日成交额（百万元） */
  hgt: number | null;
  /** 深股通当日成交额（百万元） */
  sgt: number | null;
  /** 港股通（上海）当日成交额（百万元） */
  ggtSs: number | null;
  /** 港股通（深圳）当日成交额（百万元） */
  ggtSz: number | null;
};

export type MainFlowRankingItem = {
  tsCode: string;
  name: string | null;
  industry: string | null;
  /** 主力净流入（万元） */
  mainNetInflow: number;
  /** 超大单净流入（万元） */
  elgNetInflow: number;
  /** 大单净流入（万元） */
  lgNetInflow: number;
  /** 中单净流入（万元）— 后端待支持，现返回 undefined */
  mdNetInflow?: number;
  /** 小单净流入（万元）— 后端待支持，现返回 undefined */
  smNetInflow?: number;
  /** 当日涨跌幅 % */
  pctChg: number | null;
  /** 当日成交额（千元） */
  amount: number | null;
};

export type StockFlowDetailItem = {
  tradeDate: string;
  /** 主力净流入（万元） */
  mainNetInflow: number;
  /** 散户净流入（万元） */
  retailNetInflow: number;
  /** 特大单买入（万元） */
  buyElgAmount: number;
  /** 特大单卖出（万元） */
  sellElgAmount: number;
  /** 大单买入（万元） */
  buyLgAmount: number;
  /** 大单卖出（万元） */
  sellLgAmount: number;
  /** 中单买入（万元） */
  buyMdAmount: number;
  /** 中单卖出（万元） */
  sellMdAmount: number;
  /** 小单买入（万元） */
  buySmAmount: number;
  /** 小单卖出（万元） */
  sellSmAmount: number;
  /** 总净流入（万元） */
  netMfAmount: number;
};

// ----------------------------------------------------------------------
// 资金动态 API 调用函数
// ----------------------------------------------------------------------

export async function fetchMoneyFlow(query?: {
  trade_date?: string;
}): Promise<MarketMoneyFlowDetail | null> {
  const result = await postOnce<MarketMoneyFlowDetail | MarketMoneyFlowDetail[]>(
    '/api/market/money-flow',
    query ?? {}
  );
  if (!result) return null;
  if (Array.isArray(result)) return result[0] ?? null;
  return result;
}

export function fetchMoneyFlowTrend(query?: { trade_date?: string; days?: number }) {
  return postOnce<{ data: MoneyFlowTrendItem[] }>('/api/market/money-flow-trend', query ?? {});
}

export function fetchSectorFlowRanking(query?: {
  trade_date?: string;
  content_type?: 'INDUSTRY' | 'CONCEPT' | 'REGION';
  sort_by?: 'net_amount' | 'pct_change' | 'buy_elg_amount' | 'buy_lg_amount';
  order?: 'asc' | 'desc';
  limit?: number;
  /** 后端支持双榜合并返回，dual=true 时响应包含 topInflow + topOutflow，忽略 order 参数 */
  dual?: boolean;
}) {
  return postOnce<
    | { tradeDate: string; contentType: string; sectors: SectorFlowRankingItem[] }
    | {
        tradeDate: string;
        contentType: string;
        topInflow: SectorFlowRankingItem[];
        topOutflow: SectorFlowRankingItem[];
      }
  >('/api/market/sector-flow-ranking', query ?? {});
}

export function fetchSectorFlowTrend(query: {
  ts_code: string;
  content_type?: 'INDUSTRY' | 'CONCEPT' | 'REGION';
  days?: number;
}) {
  return postOnce<{ tsCode: string; name: string; data: SectorFlowTrendItem[] }>(
    '/api/market/sector-flow-trend',
    query
  );
}

export function fetchHsgtFlow(query?: { trade_date?: string; days?: number }) {
  return postOnce<{ tradeDate: string | null; history: HsgtTrendItem[] }>(
    '/api/market/hsgt-flow',
    query ?? {}
  );
}

export function fetchHsgtTrend(query?: { period?: string; trade_date?: string }) {
  return postOnce<{ period: string; data: HsgtTrendItem[] }>('/api/market/hsgt-trend', query ?? {});
}

export type MainFlowRankingResponse =
  | { tradeDate: string; data: MainFlowRankingItem[] }
  | { tradeDate: string; topInflow: MainFlowRankingItem[]; topOutflow: MainFlowRankingItem[] };

export function fetchMainFlowRanking(query?: {
  trade_date?: string;
  /** 后端待支持：排序维度 */
  sort_by?: string;
  /** 后端待支持：dual=true 时单次返回 topInflow + topOutflow */
  dual?: boolean;
  order?: string;
  limit?: number;
}) {
  return postOnce<MainFlowRankingResponse>('/api/market/main-flow-ranking', query ?? {});
}

export function fetchStockFlowDetail(query: { ts_code: string; days?: number }) {
  return postOnce<{ tsCode: string; name: string; data: StockFlowDetailItem[] }>(
    '/api/market/stock-flow-detail',
    query
  );
}

// ----------------------------------------------------------------------
// 行业轮动 类型定义
// ----------------------------------------------------------------------

export type RotationOverviewResult = {
  tradeDate: string;
  period: string;
  topGainers: Array<{ name: string; pctChange: number }>;
  topLosers: Array<{ name: string; pctChange: number }>;
  topInflows: Array<{ name: string; netAmount: number }>;
  avgPctChange: number;
  riseCount: number;
  fallCount: number;
  totalCount: number;
};

export type RotationHeatmapSector = {
  name: string;
  pctChange: number;
  amount: number;
  netAmount: number;
  children?: Array<{ name: string; pctChange: number; amount: number }>;
};

export type RotationHeatmapResult = {
  tradeDate: string;
  sectors: RotationHeatmapSector[];
};

export type MomentumRankingItem = {
  name: string;
  momentum: number;
  rank: number;
  prevRank: number;
  rankChange: number;
  /** 成交额（万元） */
  amount?: number;
};

export type MomentumRankingResult = {
  tradeDate: string;
  period: string;
  rankings: MomentumRankingItem[];
};

type BackendReturnComparisonIndustry = {
  tsCode: string;
  name: string;
  returns: Record<string, number | null>;
  latestPctChange: number | null;
  latestClose: number | null;
};

type BackendReturnComparisonResponse = {
  tradeDate: string;
  industries: BackendReturnComparisonIndustry[];
};

function readReturnValue(
  returns: Record<string, number | null> | undefined,
  period: string | number
): number | null {
  const value = returns?.[String(period)];
  return value == null ? null : value;
}

// ----------------------------------------------------------------------
// 行业轮动 API 调用函数
// ----------------------------------------------------------------------

/**
 * Overview cards need full-universe counts/average. The backend `/overview` endpoint only returns
 * snapshots, so this adapter derives the cards from `/return-comparison` to avoid fabricated totals.
 */
export async function fetchRotationOverview(query?: {
  trade_date?: string;
  period_days?: number;
}): Promise<RotationOverviewResult> {
  const periodDays = query?.period_days ?? 20;
  const payload: {
    trade_date?: string;
    periods: number[];
    sort_period: number;
    order: 'desc';
  } = {
    periods: [periodDays],
    sort_period: periodDays,
    order: 'desc',
  };
  if (query?.trade_date) payload.trade_date = query.trade_date;

  const res = await postOnce<BackendReturnComparisonResponse>(
    '/api/industry-rotation/return-comparison',
    payload
  );

  const returns = (res?.industries ?? [])
    .map((ind) => ({
      name: ind.name,
      pctChange: readReturnValue(ind.returns, periodDays),
    }))
    .filter((item): item is { name: string; pctChange: number } => item.pctChange != null);

  const sortedDesc = [...returns].sort((a, b) => b.pctChange - a.pctChange);
  const sortedAsc = [...returns].sort((a, b) => a.pctChange - b.pctChange);
  const sumPctChange = returns.reduce((sum, item) => sum + item.pctChange, 0);

  return {
    tradeDate: res?.tradeDate ?? '',
    period: `${periodDays}d`,
    topGainers: sortedDesc.filter((item) => item.pctChange > 0).slice(0, 5),
    topLosers: sortedAsc.filter((item) => item.pctChange < 0).slice(0, 5),
    topInflows: [],
    avgPctChange: returns.length > 0 ? sumPctChange / returns.length : 0,
    riseCount: returns.filter((item) => item.pctChange > 0).length,
    fallCount: returns.filter((item) => item.pctChange < 0).length,
    totalCount: returns.length,
  };
}

/** BE returns { periods, industries: [{tsCode, name, returns}] };
 *  adapter maps to FE { sectors: [{name, pctChange, amount, netAmount}] } */
export async function fetchRotationHeatmap(query?: {
  trade_date?: string;
  periods?: number[];
}): Promise<RotationHeatmapResult> {
  const res = await postOnce<{
    tradeDate: string;
    periods: number[];
    industries: Array<{ tsCode: string; name: string; returns: Record<string, number | null> }>;
  }>('/api/industry-rotation/heatmap', query ?? {});

  const firstPeriod = String(res?.periods?.[0] ?? '');

  return {
    tradeDate: res?.tradeDate ?? '',
    sectors: (res?.industries ?? []).map((ind) => ({
      name: ind.name,
      pctChange: readReturnValue(ind.returns, firstPeriod) ?? 0,
      amount: 0,
      netAmount: 0,
    })),
  };
}

/** BE returns { method, industries: [{momentumScore, ...}] };
 *  adapter maps to FE { period, rankings: [{momentum, ...}] } */
export async function fetchMomentumRanking(query?: {
  trade_date?: string;
  method?: 'weighted' | 'simple';
  weights?: number[];
  limit?: number;
  order?: 'asc' | 'desc';
}): Promise<MomentumRankingResult> {
  const res = await postOnce<{
    tradeDate: string;
    method: string;
    industries: Array<{
      tsCode: string;
      name: string;
      momentumScore: number;
      return5d: number | null;
      return20d: number | null;
      return60d: number | null;
      latestPctChange: number | null;
      rank: number;
    }>;
  }>('/api/industry-rotation/momentum-ranking', query ?? {});

  return {
    tradeDate: res?.tradeDate ?? '',
    period: res?.method ?? 'weighted',
    rankings: (res?.industries ?? []).map((ind) => ({
      name: ind.name,
      momentum: ind.momentumScore,
      rank: ind.rank,
      prevRank: 0,
      rankChange: 0,
      amount: undefined,
    })),
  };
}

// Batch 2 types

export type ReturnComparisonSeries = {
  name: string;
  data: Array<{ tradeDate: string; cumReturn: number | null }>;
};

export type ReturnComparisonResult = {
  period: string;
  /** 后端当前不返回基准收益序列；上线前保持 null，禁止用 0 伪造。 */
  benchmark: ReturnComparisonSeries | null;
  sectors: ReturnComparisonSeries[];
};

export type FlowAnalysisItem = {
  name: string;
  netInflow: number;
  inflowAmount: number;
  outflowAmount: number;
  inflowRatio: number;
};

export type FlowAnalysisResult = {
  tradeDate: string;
  period: string;
  flows: FlowAnalysisItem[];
  topInflowSectors: string[];
  topOutflowSectors: string[];
};

export type SectorValuationItem = {
  name: string;
  peTtm: number | null;
  pbMrq: number | null;
  pePercentile: number | null;
  pbPercentile: number | null;
  pePercentile3y: number | null;
  pbPercentile3y: number | null;
};

export type SectorValuationResult = {
  tradeDate: string;
  sectors: SectorValuationItem[];
};

export type RotationDetailTopStock = {
  tsCode: string;
  name: string;
  pctChg: number | null;
  peTtm: number | null;
  pb: number | null;
  totalMv: number | null;
};

export type RotationDetailResult = {
  sectorName: string;
  tradeDate: string;
  pctChange: number;
  amount: number | null;
  netAmount: number;
  momentum: number | null;
  pePercentile: number | null;
  pbPercentile: number | null;
  returnTrend: Array<{
    tradeDate: string;
    close: number | null;
    pctChange: number | null;
    cumReturn: number;
    /** 后端当前不返回基准收益；上线前保持 null。 */
    benchmarkReturn: number | null;
  }>;
  flowTrend: Array<{ tradeDate: string; netInflow: number; cumulativeInflow: number }>;
  topStocks: RotationDetailTopStock[];
};

/** BE returns { industries: [{tsCode, name, returns: Record<period, number>}] };
 *  adapter creates time-series format expected by FE */
export async function fetchReturnComparison(query?: {
  trade_date?: string;
  periods?: number[];
  sort_period?: number;
  order?: 'asc' | 'desc';
}): Promise<ReturnComparisonResult> {
  const res = await postOnce<{
    tradeDate: string;
    industries: BackendReturnComparisonIndustry[];
  }>('/api/industry-rotation/return-comparison', query ?? {});

  const industries = res?.industries ?? [];
  // Sort period keys numerically (e.g., ['5','20','60'] not lexicographic ['20','5','60'])
  const periodKeys =
    industries.length > 0
      ? Object.keys(industries[0].returns ?? {}).sort((a, b) => Number(a) - Number(b))
      : [];

  return {
    period: periodKeys.join(','),
    benchmark: null,
    sectors: industries.map((ind) => ({
      name: ind.name,
      data: periodKeys.map((pk) => ({
        tradeDate: `${pk}d`,
        cumReturn: readReturnValue(ind.returns, pk),
      })),
    })),
  };
}

/** BE returns { days, industries: [...], summary }; adapter maps to FE { period, flows, ... } */
export async function fetchFlowAnalysis(query?: {
  trade_date?: string;
  days?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
  limit?: number;
}): Promise<FlowAnalysisResult> {
  const res = await postOnce<{
    tradeDate: string;
    days: number;
    industries: Array<{
      tsCode: string;
      name: string;
      cumulativeNetAmount: number;
      avgDailyNetAmount: number;
      cumulativeReturn: number | null;
      flowMomentum: number;
      flowAcceleration: number | null;
      cumulativeBuyElg: number;
      cumulativeBuyLg: number;
      mainForceRatio: number | null;
      latestDayRank: number | null;
    }>;
    summary: {
      inflowCount: number;
      outflowCount: number;
      topInflowNames: string[];
      topOutflowNames: string[];
    };
  }>('/api/industry-rotation/flow-analysis', query ?? {});

  return {
    tradeDate: res?.tradeDate ?? '',
    period: String(res?.days ?? ''),
    flows: (res?.industries ?? []).map((ind) => ({
      name: ind.name,
      netInflow: ind.cumulativeNetAmount,
      inflowAmount: ind.cumulativeNetAmount > 0 ? ind.cumulativeNetAmount : 0,
      outflowAmount: ind.cumulativeNetAmount < 0 ? Math.abs(ind.cumulativeNetAmount) : 0,
      inflowRatio: ind.mainForceRatio ?? 0,
    })),
    topInflowSectors: res?.summary?.topInflowNames ?? [],
    topOutflowSectors: res?.summary?.topOutflowNames ?? [],
  };
}

/** BE returns { industries: [{industry, peTtmMedian, pbMedian, peTtmPercentile1y, ...}] };
 *  adapter maps to FE { sectors: [{name, peTtm, pbMrq, pePercentile, ...}] } */
export async function fetchSectorValuation(query?: {
  trade_date?: string;
  industry?: string;
  sort_by?: 'pe_ttm' | 'pb' | 'pe_percentile_1y' | 'pb_percentile_1y';
  order?: 'asc' | 'desc';
}): Promise<SectorValuationResult> {
  const res = await postOnce<{
    tradeDate: string;
    industries: Array<{
      industry: string;
      stockCount: number;
      peTtmMedian: number | null;
      pbMedian: number | null;
      peTtmPercentile1y: number | null;
      peTtmPercentile3y: number | null;
      pbPercentile1y: number | null;
      pbPercentile3y: number | null;
      valuationLabel: string;
    }>;
  }>('/api/industry-rotation/valuation', query ?? {});

  return {
    tradeDate: res?.tradeDate ?? '',
    sectors: (res?.industries ?? []).map((ind) => ({
      name: ind.industry,
      peTtm: ind.peTtmMedian,
      pbMrq: ind.pbMedian,
      pePercentile: ind.peTtmPercentile1y,
      pbPercentile: ind.pbPercentile1y,
      pePercentile3y: ind.peTtmPercentile3y,
      pbPercentile3y: ind.pbPercentile3y,
    })),
  };
}

/** BE returns { industry, returnTrend, flowTrend, valuation, topStocks };
 *  adapter maps to FE RotationDetailResult */
export async function fetchRotationDetail(query: {
  tsCode?: string;
  industry?: string;
  days?: number;
}): Promise<RotationDetailResult> {
  const res = await postOnce<{
    industry: string;
    tsCode: string | null;
    returnTrend: Array<{
      tradeDate: string;
      close: number;
      pctChange: number;
      cumulativeReturn: number;
    }>;
    flowTrend: Array<{
      tradeDate: string;
      netAmount: number;
      cumulativeNet: number;
      buyElgAmount: number;
      buyLgAmount: number;
    }>;
    valuation: {
      peTtmMedian: number | null;
      pbMedian: number | null;
      peTtmPercentile1y: number | null;
      pbPercentile1y: number | null;
      valuationLabel: string | null;
    } | null;
    topStocks: Array<{
      tsCode: string;
      name: string;
      pctChg: number | null;
      peTtm: number | null;
      pb: number | null;
      totalMv: number | null;
    }>;
  }>('/api/industry-rotation/detail', query);

  const latestReturn = res?.returnTrend?.at(-1);
  const latestFlow = res?.flowTrend?.at(-1);

  return {
    sectorName: res?.industry ?? '',
    tradeDate: latestReturn?.tradeDate ?? '',
    pctChange: latestReturn?.pctChange ?? 0,
    amount: null,
    netAmount: latestFlow?.netAmount ?? 0,
    momentum: null,
    pePercentile: res?.valuation?.peTtmPercentile1y ?? null,
    pbPercentile: res?.valuation?.pbPercentile1y ?? null,
    returnTrend: (res?.returnTrend ?? []).map((p) => ({
      tradeDate: p.tradeDate,
      close: p.close,
      pctChange: p.pctChange,
      cumReturn: p.cumulativeReturn,
      benchmarkReturn: null,
    })),
    flowTrend: (res?.flowTrend ?? []).map((p) => ({
      tradeDate: p.tradeDate,
      netInflow: p.netAmount,
      cumulativeInflow: p.cumulativeNet,
    })),
    topStocks: (res?.topStocks ?? []).map((s) => ({
      tsCode: s.tsCode,
      name: s.name,
      pctChg: s.pctChg,
      peTtm: s.peTtm,
      pb: s.pb,
      totalMv: s.totalMv,
    })),
  };
}

// ─── 行业板块资金流向 ──────────────────────────────────

export type SectorFlowItem = {
  tsCode: string;
  name: string;
  pctChange: number;
  close: number;
  /** 成交额（万元） */
  amount: number;
  /** 净流入额（元，来自 moneyflow_ind_dc） */
  netAmount: number;
  /** 净流入占比 */
  netAmountRate: number;
  /** 上涨家数 */
  upCount: number;
  /** 下跌家数 */
  downCount: number;
  /** 领涨股 */
  leadStock: string | null;
  /** 领涨股涨跌幅 */
  leadPctChg: number | null;
};

export type SectorFlowResult = {
  tradeDate: string | null;
  /** 行业板块列表 */
  industry: SectorFlowItem[];
  /** 概念板块列表 */
  concept: SectorFlowItem[];
  /** 地域板块列表 */
  region: SectorFlowItem[];
};

// ─── 概念板块 ──────────────────────────────────

export type ConceptItem = {
  code: string;
  name: string;
  /** 成分股数量 */
  count: number;
  /** 涨跌幅 */
  pctChange: number | null;
  /** 成交额（万元） */
  amount: number | null;
  /** 净流入额（万元） */
  netAmount: number | null;
  /** 领涨股 */
  leadStock: string | null;
  /** 领涨股涨跌幅 */
  leadPctChg: number | null;
};

export type ConceptListResult = {
  tradeDate: string;
  total: number;
  items: ConceptItem[];
};

export type ConceptMemberItem = {
  tsCode: string;
  name: string;
  pctChg: number | null;
  close: number | null;
  amount: number | null;
  netAmount: number | null;
  industry: string | null;
};

export type ConceptMembersResult = {
  conceptCode: string;
  conceptName: string;
  tradeDate: string;
  /** 服务端返回的成分股总数（用于分页） */
  total: number;
  members: ConceptMemberItem[];
};

export function fetchSectorFlow(query?: {
  trade_date?: string;
  content_type?: 'INDUSTRY' | 'CONCEPT' | 'REGION';
  limit?: number;
}) {
  return apiClient.post<SectorFlowResult>('/api/market/sector-flow', query ?? {});
}

/** BE returns { total, page, pageSize, items: [{tsCode, name, count, listDate}] };
 *  adapter maps tsCode→code and defaults missing trading fields */
export async function fetchConceptList(query?: {
  keyword?: string;
  page?: number;
  pageSize?: number;
}): Promise<ConceptListResult> {
  const res = await apiClient.post<{
    total: number;
    page: number;
    pageSize: number;
    items: Array<{
      tsCode: string;
      name: string;
      count: number | null;
      listDate: string | null;
    }>;
  }>('/api/market/concept/list', query ?? {});

  return {
    tradeDate: '',
    total: res?.total ?? 0,
    items: (res?.items ?? []).map((it) => ({
      code: it.tsCode,
      name: it.name,
      count: it.count ?? 0,
      pctChange: null,
      amount: null,
      netAmount: null,
      leadStock: null,
      leadPctChg: null,
    })),
  };
}

/** BE returns { tsCode, name, total, items: [{conCode, conName}] };
 *  adapter maps to FE { conceptCode, conceptName, members: [{tsCode, name, ...}] } */
export async function fetchConceptMembers(query: {
  tsCode: string;
  name?: string;
  page?: number;
  pageSize?: number;
}): Promise<ConceptMembersResult> {
  const res = await apiClient.post<{
    tsCode: string;
    name: string | null;
    total: number;
    items: Array<{
      conCode: string;
      conName: string | null;
    }>;
  }>('/api/market/concept/members', query);

  return {
    conceptCode: res?.tsCode ?? '',
    conceptName: res?.name ?? '',
    tradeDate: '',
    total: res?.total ?? 0,
    members: (res?.items ?? []).map((it) => ({
      tsCode: it.conCode,
      name: it.conName ?? '',
      pctChg: null,
      close: null,
      amount: null,
      netAmount: null,
      industry: null,
    })),
  };
}

// ── 每日全景 (daily_info) ─────────────────────────────────────

export type DailyInfoResult = {
  tradeDate: string;
  /** 全市场成交额（亿元） */
  totalAmount: number;
  /** 全市场平均换手率 */
  avgTurnover: number;
  /** 涨停家数 */
  limitUpCount: number;
  /** 跌停家数 */
  limitDownCount: number;
  /** 涨停封板率 */
  limitUpSealRate: number;
  /** 连板股数量 */
  continuousLimitCount: number;
  /** 上涨家数 */
  riseCount: number;
  /** 下跌家数 */
  fallCount: number;
  /** 平盘家数 */
  flatCount: number;
};

// ── 市场宽度 (market-breadth) ─────────────────────────────

export type MarketBreadthResult = {
  tradeDate: string;
  /** 涨停家数 (pct_chg ≥ 9.5) */
  limitUp: number;
  /** 跌停家数 (pct_chg ≤ -9.5) */
  limitDown: number;
  /** 大涨家数 (pct_chg ≥ 5%) */
  bigRise: number;
  /** 上涨家数 (0.001% ≤ pct_chg < 5%) */
  rise: number;
  /** 平盘家数 */
  flat: number;
  /** 下跌家数 (-5% < pct_chg < -0.001%) */
  fall: number;
  /** 大跌家数 (pct_chg ≤ -5%) */
  bigFall: number;
  /** 当日有行情 A 股总数 */
  total: number;
};

export function fetchMarketBreadth(query?: MarketQueryBase) {
  return postOnce<MarketBreadthResult>('/api/market/market-breadth', query ?? {});
}

// ── 指数行情 + 迷你走势（合并接口）────────────────────────────

export type IndexQuoteWithSparklineItem = {
  tsCode: string;
  name: string;
  tradeDate: string;
  close: number | null;
  preClose: number | null;
  change: number | null;
  pctChg: number | null;
  vol: number | null;
  /** 成交额（千元） */
  amount: number | null;
  /** 近 N 交易日收盘价数组（升序） */
  sparkline: (number | null)[];
};

export type IndexQuoteWithSparklineResult = {
  tradeDate: string;
  sparklinePeriod: string;
  indices: IndexQuoteWithSparklineItem[];
};

export function fetchIndexQuoteWithSparkline(
  query?: MarketQueryBase & { sparkline_period?: string }
) {
  return postOnce<IndexQuoteWithSparklineResult>(
    '/api/market/index-quote-with-sparkline',
    query ?? {}
  );
}
