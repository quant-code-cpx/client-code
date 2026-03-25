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
// API 封装
// ----------------------------------------------------------------------

export const stockApi = {
  /** 股票列表（分页 + 多维筛选 + 排序） */
  list: (query: StockListQuery): Promise<StockListResult> =>
    apiClient.post<StockListResult>('/api/stock/list', query),
};
