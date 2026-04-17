import { apiClient } from './client';

// ----------------------------------------------------------------------
// 机构行为分析
// ----------------------------------------------------------------------

export type FundHoldingItem = {
  fundCode: string;
  fundName: string;
  tsCode: string;
  stockName: string;
  /** 持仓市值（万元） */
  marketValue: number;
  /** 占基金净值比例 */
  navPercent: number;
  /** 持股数量（万股） */
  holdVolume: number;
  /** 报告期 YYYYMMDD */
  endDate: string;
};

export type InstitutionalSummary = {
  tsCode: string;
  stockName: string;
  /** 持有该股的基金数量 */
  fundCount: number;
  /** 总持仓市值（万元） */
  totalMarketValue: number;
  /** 较上期基金数变动 */
  fundCountChange: number;
  /** 较上期持仓市值变动 */
  mvChange: number;
  endDate: string;
};

export type EtfFlowItem = {
  tsCode: string;
  fundName: string;
  tradeDate: string;
  /** 份额（万份） */
  shares: number;
  /** 份额变动（万份） */
  sharesChange: number;
  /** 净值 */
  nav: number;
  /** 估算资金流入（万元）= sharesChange * nav */
  estimatedFlow: number;
};

export function fetchInstitutionalHoldings(tsCode: string, query?: { end_date?: string }) {
  return apiClient.post<FundHoldingItem[]>('/api/fund/holdings', { ts_code: tsCode, ...query });
}

export function fetchInstitutionalSummary(query?: { end_date?: string; top_n?: number }) {
  return apiClient.post<InstitutionalSummary[]>('/api/fund/institutional-summary', query ?? {});
}

export function fetchEtfFlow(query?: { days?: number; top_n?: number }) {
  return apiClient.post<EtfFlowItem[]>('/api/fund/etf-flow', query ?? {});
}
