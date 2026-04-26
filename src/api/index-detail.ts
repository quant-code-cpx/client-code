import { apiClient } from './client';

// ─── /index/list ────────────────────────────────────────────

export type IndexInfo = {
  tsCode: string;
  name: string;
};

export function fetchIndexList() {
  return apiClient.post<IndexInfo[]>('/api/index/list', {});
}

// ─── /index/daily ───────────────────────────────────────────

export type IndexDailyQuery = {
  ts_code: string;
  start_date?: string;
  end_date?: string;
  trade_date?: string;
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

/** BE returns { tsCode, name, data: IndexDailyItem[] }; adapter unwraps to flat array */
export async function fetchIndexDaily(query: IndexDailyQuery): Promise<IndexDailyItem[]> {
  const res = await apiClient.post<{
    tsCode: string;
    name: string;
    data: IndexDailyItem[];
  }>('/api/index/daily', query);
  return res?.data ?? [];
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
  weight: number | null;
  close: number | null;
  pctChg: number | null;
  totalMv: number | null;
  circMv: number | null;
};

export type IndexConstituentResult = {
  tsCode: string;
  name: string;
  tradeDate: string;
  totalCount: number;
  constituents: IndexConstituentItem[];
};

/** BE returns { indexCode, indexName, tradeDate, total, constituents: [{conCode, name, weight, tradeDate}] };
 *  adapter maps to FE convention */
export async function fetchIndexConstituents(
  query: IndexConstituentQuery
): Promise<IndexConstituentResult> {
  const res = await apiClient.post<{
    indexCode: string;
    indexName: string;
    tradeDate: string;
    total: number;
    constituents: Array<{
      conCode: string;
      name: string | null;
      industry: string | null;
      weight: number | null;
      close: number | null;
      pctChg: number | null;
      totalMv: number | null;
      circMv: number | null;
      tradeDate: string;
    }>;
  }>('/api/index/constituents', query);

  return {
    tsCode: res?.indexCode ?? '',
    name: res?.indexName ?? '',
    tradeDate: res?.tradeDate ?? '',
    totalCount: res?.total ?? 0,
    constituents: (res?.constituents ?? []).map((c) => ({
      tsCode: c.conCode,
      name: c.name ?? '',
      industry: c.industry ?? '',
      weight: c.weight,
      close: c.close,
      pctChg: c.pctChg,
      totalMv: c.totalMv,
      circMv: c.circMv,
    })),
  };
}
