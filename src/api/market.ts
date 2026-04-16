import { apiClient } from './client';

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
  return apiClient.post<IndexQuoteItem[]>('/api/market/index-quote', query ?? {});
}

export function fetchIndexTrend(query?: IndexTrendQuery) {
  return apiClient.post<IndexTrendResult>('/api/market/index-trend', query ?? {});
}

export function fetchSentiment(query?: MarketQueryBase) {
  return apiClient.post<SentimentResult>('/api/market/sentiment', query ?? {});
}

export function fetchChangeDistribution(query?: MarketQueryBase) {
  return apiClient.post<ChangeDistributionResult>('/api/market/change-distribution', query ?? {});
}

export function fetchSentimentTrend(query?: MarketQueryBase & { days?: number }) {
  return apiClient.post<{ data: SentimentTrendItem[] }>('/api/market/sentiment-trend', query ?? {});
}

export function fetchSectorRanking(query?: MarketQueryBase & { sort_by?: string; limit?: number }) {
  return apiClient.post<{ tradeDate: string; sectors: SectorRankingItem[] }>(
    '/api/market/sector-ranking',
    query ?? {}
  );
}

export function fetchVolumeOverview(query?: MarketQueryBase & { days?: number }) {
  return apiClient.post<{ data: VolumeOverviewItem[] }>('/api/market/volume-overview', query ?? {});
}

export function fetchValuation(query?: MarketQueryBase) {
  return apiClient.post<ValuationResult>('/api/market/valuation', query ?? {});
}

export function fetchValuationTrend(query?: { period?: string }) {
  return apiClient.post<{ period: string; data: ValuationTrendItem[] }>(
    '/api/market/valuation-trend',
    query ?? {}
  );
}

// ----------------------------------------------------------------------
// 资金动态 类型定义
// ----------------------------------------------------------------------

export type MarketMoneyFlowDetail = {
  tradeDate: string;
  /** 净流入额（元） */
  netAmount: number | null;
  netAmountRate: number | null;
  /** 超大单净流入（元） */
  buyElgAmount: number | null;
  buyElgAmountRate: number | null;
  /** 大单净流入（元） */
  buyLgAmount: number | null;
  buyLgAmountRate: number | null;
  /** 中单净流入（元） */
  buyMdAmount: number | null;
  buyMdAmountRate: number | null;
  /** 小单净流入（元） */
  buySmAmount: number | null;
  buySmAmountRate: number | null;
  closeSh: number | null;
  pctChangeSh: number | null;
  closeSz: number | null;
  pctChangeSz: number | null;
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
  /** 北向当日净买入（百万元） */
  northMoney: number | null;
  /** 南向当日净买入（百万元） */
  southMoney: number | null;
  /** 沪股通（百万元） */
  hgt: number | null;
  /** 深股通（百万元） */
  sgt: number | null;
  /** 港股通（上海）百万元 */
  ggtSs: number | null;
  /** 港股通（深圳）百万元 */
  ggtSz: number | null;
  /** 累计北向净买入（百万元） */
  cumulativeNorth?: number;
  /** 累计南向净买入（百万元） */
  cumulativeSouth?: number;
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
  const result = await apiClient.post<MarketMoneyFlowDetail[]>(
    '/api/market/money-flow',
    query ?? {}
  );
  return result?.[0] ?? null;
}

export function fetchMoneyFlowTrend(query?: { trade_date?: string; days?: number }) {
  return apiClient.post<{ data: MoneyFlowTrendItem[] }>(
    '/api/market/money-flow-trend',
    query ?? {}
  );
}

export function fetchSectorFlowRanking(query?: {
  trade_date?: string;
  content_type?: 'INDUSTRY' | 'CONCEPT' | 'REGION';
  sort_by?: 'net_amount' | 'pct_change' | 'buy_elg_amount';
  order?: 'asc' | 'desc';
  limit?: number;
}) {
  return apiClient.post<{
    tradeDate: string;
    contentType: string;
    sectors: SectorFlowRankingItem[];
  }>('/api/market/sector-flow-ranking', query ?? {});
}

export function fetchSectorFlowTrend(query: {
  ts_code: string;
  content_type?: 'INDUSTRY' | 'CONCEPT' | 'REGION';
  days?: number;
}) {
  return apiClient.post<{ tsCode: string; name: string; data: SectorFlowTrendItem[] }>(
    '/api/market/sector-flow-trend',
    query
  );
}

export function fetchHsgtFlow(query?: { trade_date?: string; days?: number }) {
  return apiClient.post<{ tradeDate: string | null; history: HsgtTrendItem[] }>(
    '/api/market/hsgt-flow',
    query ?? {}
  );
}

export function fetchHsgtTrend(query?: { period?: string }) {
  return apiClient.post<{ period: string; data: HsgtTrendItem[] }>(
    '/api/market/hsgt-trend',
    query ?? {}
  );
}

export function fetchMainFlowRanking(query?: {
  trade_date?: string;
  order?: string;
  limit?: number;
}) {
  return apiClient.post<{ tradeDate: string; data: MainFlowRankingItem[] }>(
    '/api/market/main-flow-ranking',
    query ?? {}
  );
}

export function fetchStockFlowDetail(query: { ts_code: string; days?: number }) {
  return apiClient.post<{ tsCode: string; name: string; data: StockFlowDetailItem[] }>(
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
};

export type MomentumRankingResult = {
  tradeDate: string;
  period: string;
  rankings: MomentumRankingItem[];
};

// ----------------------------------------------------------------------
// 行业轮动 API 调用函数
// ----------------------------------------------------------------------

export function fetchRotationOverview(query?: { trade_date?: string }) {
  return apiClient.post<RotationOverviewResult>('/api/industry-rotation/overview', query ?? {});
}

export function fetchRotationHeatmap(query?: { trade_date?: string; periods?: string[] }) {
  return apiClient.post<RotationHeatmapResult>('/api/industry-rotation/heatmap', query ?? {});
}

export function fetchMomentumRanking(query?: {
  trade_date?: string;
  method?: 'weighted' | 'simple';
  weights?: number[];
  limit?: number;
  order?: 'asc' | 'desc';
}) {
  return apiClient.post<MomentumRankingResult>(
    '/api/industry-rotation/momentum-ranking',
    query ?? {}
  );
}

// Batch 2 types

export type ReturnComparisonSeries = {
  name: string;
  data: Array<{ tradeDate: string; cumReturn: number }>;
};

export type ReturnComparisonResult = {
  period: string;
  benchmark: ReturnComparisonSeries;
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
  peTtm: number;
  pbMrq: number;
  pePercentile: number;
  pbPercentile: number;
  peMedian3y: number;
  pbMedian3y: number;
};

export type SectorValuationResult = {
  tradeDate: string;
  sectors: SectorValuationItem[];
};

export type RotationDetailTopStock = {
  tsCode: string;
  name: string;
  pctChg: number;
  mainNetInflow: number;
  amount: number;
};

export type RotationDetailResult = {
  sectorName: string;
  tradeDate: string;
  pctChange: number;
  amount: number;
  netAmount: number;
  momentum: number;
  pePercentile: number;
  pbPercentile: number;
  returnTrend: Array<{ tradeDate: string; cumReturn: number; benchmarkReturn: number }>;
  flowTrend: Array<{ tradeDate: string; netInflow: number; cumulativeInflow: number }>;
  topStocks: RotationDetailTopStock[];
};

export function fetchReturnComparison(query?: {
  trade_date?: string;
  periods?: string[];
  sort_period?: number;
  order?: 'asc' | 'desc';
}) {
  return apiClient.post<ReturnComparisonResult>(
    '/api/industry-rotation/return-comparison',
    query ?? {}
  );
}

export function fetchFlowAnalysis(query?: {
  trade_date?: string;
  days?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
  limit?: number;
}) {
  return apiClient.post<FlowAnalysisResult>('/api/industry-rotation/flow-analysis', query ?? {});
}

export function fetchSectorValuation(query?: {
  trade_date?: string;
  industry?: string;
  sort_by?: 'pe_ttm' | 'pb' | 'pe_percentile_1y' | 'pb_percentile_1y';
  order?: 'asc' | 'desc';
}) {
  return apiClient.post<SectorValuationResult>('/api/industry-rotation/valuation', query ?? {});
}

export function fetchRotationDetail(query: { industry: string; days?: number }) {
  return apiClient.post<RotationDetailResult>('/api/industry-rotation/detail', query);
}

// ─── 行业板块资金流向 ──────────────────────────────────

export type SectorFlowItem = {
  tsCode: string;
  name: string;
  pctChange: number;
  close: number;
  /** 成交额（万元） */
  amount: number;
  /** 净流入额（万元） */
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
  tradeDate: string;
  sectors: SectorFlowItem[];
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
  members: ConceptMemberItem[];
};

export function fetchSectorFlow(query?: {
  trade_date?: string;
  content_type?: 'INDUSTRY' | 'CONCEPT' | 'REGION';
  limit?: number;
}) {
  return apiClient.post<SectorFlowResult>('/api/market/sector-flow', query ?? {});
}

export function fetchConceptList(query?: { keyword?: string; page?: number; pageSize?: number }) {
  return apiClient.post<ConceptListResult>('/api/market/concept/list', query ?? {});
}

export function fetchConceptMembers(query: { tsCode: string; page?: number; pageSize?: number }) {
  return apiClient.post<ConceptMembersResult>('/api/market/concept/members', query);
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

export function fetchDailyInfo(query?: MarketQueryBase) {
  return apiClient.post<DailyInfoResult>('/api/market/daily-info', query ?? {});
}
