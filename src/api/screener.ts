import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type ScreenerFilters = {
  // 基本面
  exchange?: string;
  market?: string;
  industry?: string;
  area?: string;
  isHs?: string;
  // 估值
  minPeTtm?: number;
  maxPeTtm?: number;
  minPb?: number;
  maxPb?: number;
  minDvTtm?: number;
  minTotalMv?: number;
  maxTotalMv?: number;
  minCircMv?: number;
  maxCircMv?: number;
  // 行情
  minPctChg?: number;
  maxPctChg?: number;
  minTurnoverRate?: number;
  maxTurnoverRate?: number;
  minAmount?: number;
  maxAmount?: number;
  // 成长
  minRevenueYoy?: number;
  maxRevenueYoy?: number;
  minNetprofitYoy?: number;
  maxNetprofitYoy?: number;
  // 盈利
  minRoe?: number;
  maxRoe?: number;
  minGrossMargin?: number;
  maxGrossMargin?: number;
  minNetMargin?: number;
  maxNetMargin?: number;
  // 财务
  maxDebtToAssets?: number;
  minCurrentRatio?: number;
  minQuickRatio?: number;
  // 现金流
  minOcfToNetprofit?: number;
  // 资金
  minMainNetInflow5d?: number;
  minMainNetInflow20d?: number;
};

export type ScreenerQuery = ScreenerFilters & {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type StockScreenerItem = {
  tsCode: string;
  name: string | null;
  industry: string | null;
  market: string | null;
  listDate: string | null;
  close: number | null;
  pctChg: number | null;
  amount: number | null;
  turnoverRate: number | null;
  peTtm: number | null;
  pb: number | null;
  dvTtm: number | null;
  totalMv: number | null;
  circMv: number | null;
  revenueYoy: number | null;
  netprofitYoy: number | null;
  roe: number | null;
  grossMargin: number | null;
  netMargin: number | null;
  debtToAssets: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  ocfToNetprofit: number | null;
  mainNetInflow5d: number | null;
  mainNetInflow20d: number | null;
  latestFinDate: string | null;
};

export type ScreenerResult = {
  page: number;
  pageSize: number;
  total: number;
  items: StockScreenerItem[];
};

export type ScreenerPreset = {
  id: string;
  name: string;
  description: string;
  filters: Partial<ScreenerFilters>;
};

export type IndustryItem = { name: string; count: number };
export type AreaItem = { name: string; count: number };

// ----------------------------------------------------------------------
// API 调用函数
// ----------------------------------------------------------------------

export function fetchScreener(query: ScreenerQuery): Promise<ScreenerResult> {
  return apiClient.post<ScreenerResult>('/api/stock/screener', query);
}

export function fetchScreenerPresets(): Promise<{ presets: ScreenerPreset[] }> {
  return apiClient.post<{ presets: ScreenerPreset[] }>('/api/stock/screener/presets', {});
}

export function fetchIndustries(): Promise<{ industries: IndustryItem[] }> {
  return apiClient.get<{ industries: IndustryItem[] }>('/api/stock/industries');
}

export function fetchAreas(): Promise<{ areas: AreaItem[] }> {
  return apiClient.get<{ areas: AreaItem[] }>('/api/stock/areas');
}
