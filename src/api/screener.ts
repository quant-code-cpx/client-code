import { apiClient } from './client';

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

export type BuySignal =
  | 'MACD_GOLDEN_CROSS'
  | 'KDJ_GOLDEN_CROSS'
  | 'MA_BULLISH'
  | 'BOLL_OVERSOLD'
  | 'RSI_OVERSOLD';

export type ScreenerFilters = {
  // 基本面
  exchange?: string;
  market?: string;
  industry?: string;
  area?: string;
  isHs?: string;
  // 基本面（V2 多选）
  industries?: string[];
  areas?: string[];
  conceptCodes?: string[];
  // 估值
  minPeTtm?: number;
  maxPeTtm?: number;
  minPb?: number;
  maxPb?: number;
  minPsTtm?: number;
  maxPsTtm?: number;
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
  // 技术信号
  minBuySignalCount?: number;
  macdSignal?: string;
  kdjSignal?: string;
  rsiSignal?: string;
  minRsi6?: number;
  maxRsi6?: number;
  bollSignal?: 'above_upper' | 'below_lower' | 'squeeze';
  maTrend?: 'bullish' | 'bearish';
  // 北向资金
  northboundOnly?: boolean;
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
  psTtm: number | null;
  buySignalCount: number | null;
  buySignals: BuySignal[] | null;
  concepts: string[] | null;
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
  filters: Partial<ScreenerFilters> & {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type IndustryItem = { name: string; count: number };
export type AreaItem = { name: string; count: number };
export type ScreenerConceptItem = { tsCode: string; name: string; count: number };

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
  return apiClient.post<{ industries: IndustryItem[] }>('/api/stock/industries');
}

export function fetchAreas(): Promise<{ areas: AreaItem[] }> {
  return apiClient.post<{ areas: AreaItem[] }>('/api/stock/areas');
}

export function fetchScreenerConcepts(): Promise<{ concepts: ScreenerConceptItem[] }> {
  return apiClient.post<{ concepts: ScreenerConceptItem[] }>('/api/stock/screener/concepts', {});
}

// ----------------------------------------------------------------------
// 用户自定义策略
// ----------------------------------------------------------------------

export type ScreenerStrategy = {
  id: number;
  name: string;
  description: string | null;
  filters: Partial<ScreenerFilters>;
  sortBy: string | null;
  sortOrder: string | null;
  type: 'user';
  createdAt: string;
  updatedAt: string;
};

export type ScreenerPresetWithType = ScreenerPreset & { type: 'builtin' };

export type StrategyItem = ScreenerPresetWithType | ScreenerStrategy;

export function fetchStrategies(): Promise<{ strategies: ScreenerStrategy[] }> {
  return apiClient.post<{ strategies: ScreenerStrategy[] }>('/api/stock/screener/strategies/list');
}

export function createStrategy(data: {
  name: string;
  description?: string;
  filters: Partial<ScreenerFilters>;
  sortBy?: string;
  sortOrder?: string;
}): Promise<ScreenerStrategy> {
  return apiClient.post<ScreenerStrategy>('/api/stock/screener/strategies', data);
}

export function updateStrategy(
  id: number,
  data: {
    name?: string;
    description?: string;
    filters?: Partial<ScreenerFilters>;
    sortBy?: string;
    sortOrder?: string;
  }
): Promise<ScreenerStrategy> {
  return apiClient.post<ScreenerStrategy>('/api/stock/screener/strategies/update', { id, ...data });
}

export function deleteStrategy(id: number): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/api/stock/screener/strategies/delete', { id });
}
