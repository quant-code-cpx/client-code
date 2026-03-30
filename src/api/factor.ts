import { apiClient } from './client';

// ─── 枚举类型 ────────────────────────────────────────────────────

export type FactorCategory =
  | 'VALUATION'
  | 'SIZE'
  | 'MOMENTUM'
  | 'VOLATILITY'
  | 'LIQUIDITY'
  | 'QUALITY'
  | 'GROWTH'
  | 'CAPITAL_FLOW'
  | 'LEVERAGE'
  | 'DIVIDEND'
  | 'TECHNICAL'
  | 'CUSTOM';

export type FactorSourceType = 'FIELD_REF' | 'DERIVED' | 'CUSTOM_SQL';

// ─── 因子库类型 ────────────────────────────────────────────────

export type FactorDef = {
  id: string;
  name: string;
  label: string;
  description?: string;
  category: FactorCategory;
  sourceType: FactorSourceType;
  isBuiltin: boolean;
};

export type FactorCategoryGroup = {
  category: FactorCategory;
  label: string;
  factors: FactorDef[];
};

export type FactorLibraryResult = {
  categories: FactorCategoryGroup[];
};

// ─── 因子截面值类型 ────────────────────────────────────────────

export type FactorValueItem = {
  tsCode: string;
  name: string;
  industry: string;
  value: number | null;
  percentile: number | null;
};

export type FactorValuesSummary = {
  count: number;
  missing: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  q25: number;
  q75: number;
};

export type FactorValuesResult = {
  factorName: string;
  tradeDate: string;
  universe?: string;
  total: number;
  page: number;
  pageSize: number;
  items: FactorValueItem[];
  summary: FactorValuesSummary;
};

// ─── IC 分析类型 ────────────────────────────────────────────────

export type IcSeriesItem = {
  tradeDate: string;
  ic: number;
  stockCount: number;
};

export type IcSummary = {
  icMean: number;
  icStd: number;
  icIr: number;
  icPositiveRate: number;
  icAboveThreshold: number;
  tStat: number;
};

export type FactorIcResult = {
  factorName: string;
  forwardDays: number;
  icMethod: 'rank' | 'normal';
  startDate: string;
  endDate: string;
  summary: IcSummary;
  series: IcSeriesItem[];
};

// ─── 分层回测类型 ────────────────────────────────────────────────

export type QuantileGroupItem = {
  tradeDate: string;
  cumReturn: number;
};

export type QuantileGroup = {
  group: string;
  label: string;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  series: QuantileGroupItem[];
};

export type FactorQuantileResult = {
  factorName: string;
  quantiles: number;
  rebalanceDays: number;
  startDate: string;
  endDate: string;
  groups: QuantileGroup[];
  longShort: Omit<QuantileGroup, 'group' | 'label'> & { series: QuantileGroupItem[] };
  benchmark: { totalReturn: number; series: QuantileGroupItem[] };
};

// ─── 因子衰减类型 ────────────────────────────────────────────────

export type DecayPeriodResult = {
  period: number;
  icMean: number;
  icIr: number;
  icPositiveRate: number;
};

export type FactorDecayResult = {
  factorName: string;
  results: DecayPeriodResult[];
};

// ─── 因子分布类型 ────────────────────────────────────────────────

export type DistributionStats = {
  count: number;
  missing: number;
  missingRate: number;
  mean: number;
  median: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  q5: number;
  q25: number;
  q75: number;
  q95: number;
};

export type HistogramBin = {
  binStart: number;
  binEnd: number;
  count: number;
};

export type FactorDistributionResult = {
  factorName: string;
  tradeDate: string;
  stats: DistributionStats;
  histogram: HistogramBin[];
};

// ─── 因子相关性类型 ────────────────────────────────────────────────

export type FactorCorrelationResult = {
  tradeDate: string;
  method: 'spearman' | 'pearson';
  factors: string[];
  factorLabels: string[];
  matrix: number[][];
};

// ─── 选股类型 ────────────────────────────────────────────────────

export type FactorConditionOperator =
  | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'top_pct' | 'bottom_pct';

export type FactorCondition = {
  factorName: string;
  operator: FactorConditionOperator;
  value?: number;
  min?: number;
  max?: number;
  percent?: number;
};

export type ScreeningItem = {
  tsCode: string;
  name: string;
  industry: string;
  factors: Record<string, number | null>;
};

export type FactorScreeningResult = {
  tradeDate: string;
  universe?: string;
  total: number;
  page: number;
  pageSize: number;
  items: ScreeningItem[];
};

// ─── API 方法定义 ────────────────────────────────────────────────

export const factorApi = {
  /** 获取因子库（按分类分组） */
  library: (params: { enabledOnly?: boolean } = {}): Promise<FactorLibraryResult> =>
    apiClient.post('/api/factor/library', params),

  /** 获取单个因子详情 */
  detail: (factorName: string): Promise<FactorDef & { stats?: FactorValuesSummary & { latestDate: string; coverage: number } }> =>
    apiClient.post('/api/factor/detail', { factorName }),

  /** 获取因子截面值（带分页） */
  values: (params: {
    factorName: string;
    tradeDate: string;
    universe?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FactorValuesResult> =>
    apiClient.post('/api/factor/values', params),

  /** IC 分析 */
  ic: (params: {
    factorName: string;
    startDate: string;
    endDate: string;
    universe?: string;
    forwardDays?: number;
    icMethod?: 'rank' | 'normal';
  }): Promise<FactorIcResult> =>
    apiClient.post('/api/factor/analysis/ic', params),

  /** 分层回测 */
  quantile: (params: {
    factorName: string;
    startDate: string;
    endDate: string;
    universe?: string;
    quantiles?: number;
    rebalanceDays?: number;
  }): Promise<FactorQuantileResult> =>
    apiClient.post('/api/factor/analysis/quantile', params),

  /** 因子衰减分析 */
  decay: (params: {
    factorName: string;
    startDate: string;
    endDate: string;
    universe?: string;
    periods?: number[];
  }): Promise<FactorDecayResult> =>
    apiClient.post('/api/factor/analysis/decay', params),

  /** 因子分布统计 */
  distribution: (params: {
    factorName: string;
    tradeDate: string;
    universe?: string;
    bins?: number;
  }): Promise<FactorDistributionResult> =>
    apiClient.post('/api/factor/analysis/distribution', params),

  /** 多因子相关性矩阵 */
  correlation: (params: {
    factorNames: string[];
    tradeDate: string;
    universe?: string;
    method?: 'spearman' | 'pearson';
  }): Promise<FactorCorrelationResult> =>
    apiClient.post('/api/factor/analysis/correlation', params),

  /** 多因子选股 */
  screening: (params: {
    conditions: FactorCondition[];
    tradeDate: string;
    universe?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
  }): Promise<FactorScreeningResult> =>
    apiClient.post('/api/factor/screening', params),
};
