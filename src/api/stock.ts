import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type StockListItem = {
  tsCode: string;
  symbol: string | null;
  name: string | null;
  fullname: string | null;
  exchange: string | null;
  currType: string | null;
  market: string | null;
  industry: string | null;
  area: string | null;
  listStatus: string | null;
  listDate: string | null;
  latestTradeDate: string | null;
  isHs: string | null;
  cnspell: string | null;
  peTtm: number | null;
  pb: number | null;
  dvTtm: number | null;
  totalMv: number | null;
  circMv: number | null;
  turnoverRate: number | null;
  pctChg: number | null;
  amount: number | null;
  close: number | null;
};

export type StockListResult = {
  page: number;
  pageSize: number;
  total: number;
  items: StockListItem[];
};

export type StockListQuery = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  /** 交易所：SSE / SZSE / BSE */
  exchange?: string;
  /** 上市状态：L / D / P，默认 L */
  listStatus?: string;
  /** 行业（模糊匹配） */
  industry?: string;
  /** 地域（模糊匹配） */
  area?: string;
  /** 板块（模糊匹配） */
  market?: string;
  /** 沪深港通：N / H / S */
  isHs?: string;
  /** 排序字段，对应后端 StockSortBy 枚举值 */
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

// ----------------------------------------------------------------------
// 股票详情 — 类型定义
// ----------------------------------------------------------------------

/** 股票详情 - 总览（基础信息 + 公司简介 + 最新行情 + 最新估值） */
export type StockDetailOverviewData = {
  basic: Record<string, unknown> | null;
  company: Record<string, unknown> | null;
  latestQuote: Record<string, unknown> | null;
  latestValuation: Record<string, unknown> | null;
  latestExpress: Record<string, unknown> | null;
};

/** K 线图单条数据 */
export type StockChartItem = {
  tradeDate: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  vol: number | null;
  amount: number | null;
  pctChg: number | null;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
};

/** K 线图数据 */
export type StockChartData = {
  tsCode: string;
  period: string;
  adjustType: string;
  items: StockChartItem[];
};

/** 资金流向汇总 */
export type StockMoneyFlowSummary = {
  netAmount5d: number;
  netAmount20d: number;
  netAmount60d: number;
};

/** 资金流向单日数据 */
export type StockMoneyFlowItem = {
  tradeDate: string;
  close: number | null;
  pctChange: number | null;
  netAmount: number | null;
  netAmountRate: number | null;
};

/** 资金流向数据 */
export type StockMoneyFlowData = {
  tsCode: string;
  summary: StockMoneyFlowSummary;
  items: StockMoneyFlowItem[];
};

/** 财务指标数据 */
export type StockFinancialsData = {
  tsCode: string;
  latest: Record<string, unknown> | null;
  history: Record<string, unknown>[];
  recentExpress: Record<string, unknown>[];
};

/** 股本股东数据 */
export type StockShareholdersData = {
  tsCode: string;
  dividendHistory: Record<string, unknown>[];
  top10Holders: Record<string, unknown>;
  top10FloatHolders: Record<string, unknown>;
};

// ----------------------------------------------------------------------
// API 封装
// ----------------------------------------------------------------------

export const stockApi = {
  /** 股票列表（分页 + 多维筛选 + 排序） */
  list: (query: StockListQuery): Promise<StockListResult> =>
    apiClient.post<StockListResult>('/api/stock/list', query),
};

export const stockDetailApi = {
  /** 股票详情 - 总览（基础信息 + 公司简介 + 最新行情 + 最新估值） */
  overview: (code: string): Promise<StockDetailOverviewData> =>
    apiClient.post<StockDetailOverviewData>('/api/stock/detail/overview', { code }),

  /** 股票详情 - K 线图（支持日/周/月 + 前/后复权） */
  chart: (params: {
    tsCode: string;
    period?: 'D' | 'W' | 'M';
    adjustType?: 'none' | 'qfq' | 'hfq';
    startDate?: string;
    endDate?: string;
  }): Promise<StockChartData> =>
    apiClient.post<StockChartData>('/api/stock/detail/chart', params),

  /** 股票详情 - 资金流向（最近 N 个交易日） */
  moneyFlow: (tsCode: string, days?: number): Promise<StockMoneyFlowData> =>
    apiClient.post<StockMoneyFlowData>('/api/stock/detail/money-flow', { tsCode, days }),

  /** 股票详情 - 财务指标（最近 N 个报告期） */
  financials: (tsCode: string, periods?: number): Promise<StockFinancialsData> =>
    apiClient.post<StockFinancialsData>('/api/stock/detail/financials', { tsCode, periods }),

  /** 股票详情 - 股东与分红历史 */
  shareholders: (tsCode: string): Promise<StockShareholdersData> =>
    apiClient.post<StockShareholdersData>('/api/stock/detail/shareholders', { tsCode }),
};
