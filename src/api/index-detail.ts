import { apiClient } from './client';

// ─── /index/list ────────────────────────────────────────────

export type IndexInfo = {
  tsCode: string;
  name: string;
  market: string;
  category: string;
  publishDate: string;
  baseDate: string;
  basePoint: number;
  listDate: string;
};

export function fetchIndexList() {
  return apiClient.post<IndexInfo[]>('/api/index/list', {});
}

// ─── /index/daily ───────────────────────────────────────────

export type IndexDailyQuery = {
  ts_code: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
};

export type IndexDailyItem = {
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  preClose: number;
  change: number;
  pctChg: number;
  vol: number;
  amount: number;
};

export function fetchIndexDaily(query: IndexDailyQuery) {
  return apiClient.post<IndexDailyItem[]>('/api/index/daily', query);
}

// ─── /index/constituents ────────────────────────────────────

export type IndexConstituentQuery = {
  index_code: string;
  trade_date?: string;
};

export type IndexConstituentItem = {
  tsCode: string;
  name: string;
  industry: string;
  weight: number;
  close: number;
  pctChg: number;
  totalMv: number;
  circMv: number;
};

export type IndexConstituentResult = {
  tsCode: string;
  name: string;
  tradeDate: string;
  totalCount: number;
  constituents: IndexConstituentItem[];
};

export function fetchIndexConstituents(query: IndexConstituentQuery) {
  return apiClient.post<IndexConstituentResult>('/api/index/constituents', query);
}
