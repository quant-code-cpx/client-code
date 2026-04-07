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
  vol: number | null;
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
  vol: number;
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
  totalAmount: number;
  shAmount: number;
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
  netAmount: number | null;
  netAmountRate: number | null;
  buyElgAmount: number | null;
  buyElgAmountRate: number | null;
  buyLgAmount: number | null;
  buyLgAmountRate: number | null;
  buyMdAmount: number | null;
  buyMdAmountRate: number | null;
  buySmAmount: number | null;
  buySmAmountRate: number | null;
  closeSh: number | null;
  pctChangeSh: number | null;
  closeSz: number | null;
  pctChangeSz: number | null;
};

export type MoneyFlowTrendItem = {
  tradeDate: string;
  netAmount: number;
  cumulativeNet: number;
  buyElgAmount: number;
  buyLgAmount: number;
  buyMdAmount: number;
  buySmAmount: number;
};

export type SectorFlowRankingItem = {
  tsCode: string;
  name: string;
  pctChange: number;
  close: number;
  netAmount: number;
  netAmountRate: number;
  buyElgAmount: number;
  buyLgAmount: number;
  buyMdAmount: number;
  buySmAmount: number;
};

export type SectorFlowTrendItem = {
  tradeDate: string;
  pctChange: number;
  netAmount: number;
  cumulativeNet: number;
};

export type HsgtTrendItem = {
  tradeDate: string;
  northMoney: number | null;
  southMoney: number | null;
  hgt: number | null;
  sgt: number | null;
  ggtSs: number | null;
  ggtSz: number | null;
  cumulativeNorth?: number;
  cumulativeSouth?: number;
};

export type MainFlowRankingItem = {
  tsCode: string;
  name: string | null;
  industry: string | null;
  mainNetInflow: number;
  elgNetInflow: number;
  lgNetInflow: number;
  pctChg: number | null;
  amount: number | null;
};

export type StockFlowDetailItem = {
  tradeDate: string;
  mainNetInflow: number;
  retailNetInflow: number;
  buyElgAmount: number;
  sellElgAmount: number;
  buyLgAmount: number;
  sellLgAmount: number;
  buyMdAmount: number;
  sellMdAmount: number;
  buySmAmount: number;
  sellSmAmount: number;
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
