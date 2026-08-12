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

/**
 * 因子预计算 / 启用状态徽标（库页显示）。
 * 前端历史枚举：FRESH / STALE / FAILED / NEVER / DISABLED；
 * 后端 factor-library.service.ts 实际下发：HEALTHY / STALE / MISSING；
 * 这里取并集，由 STATUS_META 统一映射展示。
 */
export type FactorStatus =
  | 'FRESH'
  | 'STALE'
  | 'FAILED'
  | 'NEVER'
  | 'DISABLED'
  | 'HEALTHY'
  | 'MISSING';

/** 因子质量摘要（依赖后端 BE-1 / BE-11，全部 optional） */
export type FactorSummary = {
  /** 默认 10 日 IC 均值 */
  ic10d?: number | null;
  ic5d?: number | null;
  ic20d?: number | null;
  ir?: number | null;
  /** 非空覆盖度（0~1） */
  coverage?: number | null;
  /** 最近预计算交易日 YYYYMMDD */
  lastComputeDate?: string | null;
  /** 最近预计算距今滞后天数 */
  latencyDays?: number | null;
};

/** 因子库相关因子（依赖 BE-7，optional） */
export type FactorRelatedItem = {
  name: string;
  label: string;
  corr: number;
};

export type FactorDef = {
  id: string;
  name: string;
  label: string;
  description?: string;
  category: FactorCategory;
  sourceType: FactorSourceType;
  isBuiltin: boolean;
  /** 启用状态（自定义因子可切换；后端 P1） */
  isEnabled?: boolean;
  /** 质量摘要（BE-1） */
  summary?: FactorSummary;
  /** 状态徽标（BE-2） */
  status?: FactorStatus;
  /** 后端已落库的最近因子快照交易日 YYYYMMDD */
  latestDate?: string | null;
  /** 后端快照覆盖率（0~1） */
  coverageRate?: number | null;
  /** 最近快照距今滞后天数 */
  staleDays?: number | null;
  /** LaTeX 公式（BE-6） */
  formula?: string;
  /** 文档链接（BE-6） */
  docUrl?: string;
  /** Top 相关因子（BE-7） */
  topRelated?: FactorRelatedItem[];
  /** 被引用次数（BE-8） */
  usageCount?: number;
};

export type FactorCategoryGroup = {
  category: FactorCategory;
  label: string;
  factors: FactorDef[];
};

/** 因子库聚合摘要（BE-10，optional） */
export type FactorLibraryMeta = {
  totalCount: number;
  enabledCount: number;
  customCount: number;
  staleCount: number;
};

export type FactorLibraryResult = {
  categories: FactorCategoryGroup[];
  meta?: FactorLibraryMeta;
};

/** 因子库请求参数（BE-4 扩展，全部 optional） */
export type FactorLibraryRequest = {
  category?: FactorCategory;
  enabledOnly?: boolean;
  sourceType?: FactorSourceType;
  status?: FactorStatus;
  icMin?: number;
  coverageMin?: number;
  sortBy?: 'ir' | 'ic10d' | 'coverage' | 'lastComputeDate' | 'name';
  sortOrder?: 'asc' | 'desc';
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

export type FactorCorrelationMeta = {
  /** 股票池代码（与请求参数一致） */
  universe?: string;
  /** 后端计算时间 ISO 字符串 */
  computedAt?: string;
  /** 矩阵计算口径：'pairwise' = 每对因子独立取交集 */
  matrixMode?: 'pairwise' | 'intersection';
  /** 触发 null 相关系数的最小有效样本阈值，后端默认 3 */
  minSampleForCorr?: number;
  /** Spearman 并列秩处理方式 */
  rankTiesMethod?: 'ordinal' | 'average';
};

export type FactorCorrelationResult = {
  tradeDate: string;
  method: 'spearman' | 'pearson';
  /** 因子英文名（后端按字母升序返回） */
  factors: string[];
  /** 因子标签，长度与 factors 相同；后端查不到时 fallback 为因子名 */
  factorLabels: string[];
  /** 相关系数矩阵：null 表示样本 < 3 或常数序列，不可解读为"无相关" */
  matrix: (number | null)[][];
  /** 有效样本数矩阵（pairwise）；对角线为单因子有效值数 */
  nMatrix?: number[][];
  /** 单因子覆盖率：valid / 并集股票数 */
  coverage?: number[];
  /** 计算口径元信息 */
  meta?: FactorCorrelationMeta;
};

// ─── 选股类型 ────────────────────────────────────────────────────

export type FactorConditionOperator =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'top_pct'
  | 'bottom_pct';

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
  /** 后端在股票基本信息缺失时可能返回 null */
  name: string | null;
  /** 行业可能为 null */
  industry: string | null;
  /** 因子值表（key 为因子英文名） */
  factors: Record<string, number | null>;
  /** 综合分（依赖 BE-8） */
  score?: number | null;
  /** 整体排名（依赖 BE-8 / 单因子排序） */
  rank?: number | null;
  /** 各因子分位（0~1，依赖 BE-3） */
  factorPercentiles?: Record<string, number | null>;
  /** 各因子在股票池中的排名（1-based，依赖 BE-3） */
  factorRanks?: Record<string, number | null>;
  /** 行级警告（如某因子缺失等） */
  warnings?: string[];
  /** 市场板块标识（主板/创业板/科创板/北交所等） */
  market?: string | null;
  area?: string | null;
  /** 上市日期 YYYYMMDD */
  listDate?: string | null;
  /** 是否 ST */
  isSt?: boolean;
  /** 是否停牌 */
  isSuspended?: boolean;
  /** 最近行情日 YYYYMMDD */
  latestQuoteDate?: string | null;
};

/** 单条条件命中漏斗（BE-3） */
export type FactorScreeningConditionPassCount = {
  factorName: string;
  operator: FactorConditionOperator;
  beforeCount: number;
  passCount: number;
  missingCount: number;
  afterCount: number;
  /** 后端返回 percent 类型条件的实际阈值（数值或字符串） */
  threshold?: number | string | null;
};

/** 结果摘要（BE-2） */
export type FactorScreeningSummary = {
  universeCount: number;
  matchedCount: number;
  matchedRate: number;
  missingRate: number;
  asOfTradeDate: string;
  dataFreshness?: 'FRESH' | 'STALE' | 'NEVER';
  executionMs?: number;
};

/** 行业分布桶 */
export type FactorScreeningIndustryBucket = {
  industry: string | null;
  count: number;
  ratio: number;
};

/** 因子分布概览（BE-9） */
export type FactorScreeningFactorPercentileSummary = {
  factorName: string;
  mean?: number | null;
  q25?: number | null;
  q75?: number | null;
  min?: number | null;
  max?: number | null;
};

/** 结果诊断（BE-9） */
export type FactorScreeningDiagnostics = {
  industryDistribution?: FactorScreeningIndustryBucket[];
  factorPercentiles?: FactorScreeningFactorPercentileSummary[];
};

/** 综合分配置（BE-8） */
export type FactorScoreConfig = {
  weights: { factorName: string; weight: number; direction?: 'asc' | 'desc' }[];
  standardize?: 'zscore' | 'rank' | 'none';
  winsorize?: boolean;
  industryNeutralize?: boolean;
};

/** 交易约束（Q6） */
export type FactorScreeningTradeConstraints = {
  excludeSt?: boolean;
  excludeSuspended?: boolean;
  excludeBse?: boolean;
  minListDays?: number;
};

export type FactorScreeningResult = {
  tradeDate: string;
  universe?: string;
  total: number;
  page: number;
  pageSize: number;
  items: ScreeningItem[];
  /** 条件数量（后端补） */
  conditionCount?: number;
  /** 当次请求快照 hash / id（BE-6） */
  requestId?: string;
  /** 结果摘要（BE-2） */
  summary?: FactorScreeningSummary;
  /** 条件命中漏斗（BE-3） */
  conditionPassCounts?: FactorScreeningConditionPassCount[];
  /** 诊断聚合（BE-9） */
  diagnostics?: FactorScreeningDiagnostics;
  /** 全局警告（数据缺失、被前端过滤等） */
  warnings?: string[];
};

// ─── API 方法定义 ────────────────────────────────────────────────

export const factorApi = {
  /** 获取因子库（按分类分组） */
  library: (params: FactorLibraryRequest = {}): Promise<FactorLibraryResult> =>
    apiClient.post('/api/factor/library', params),

  /** 获取单个因子详情 */
  detail: (
    factorName: string,
    signal?: AbortSignal
  ): Promise<
    FactorDef & { stats?: FactorValuesSummary & { latestDate: string; coverage: number } }
  > => apiClient.post('/api/factor/detail', { factorName }, signal),

  /** 获取因子截面值（带分页） */
  values: (params: {
    factorName: string;
    tradeDate: string;
    universe?: string;
    page?: number;
    pageSize?: number;
    sortOrder?: 'asc' | 'desc';
  }): Promise<FactorValuesResult> => apiClient.post('/api/factor/values', params),

  /** IC 分析 */
  ic: (params: {
    factorName: string;
    startDate: string;
    endDate: string;
    universe?: string;
    forwardDays?: number;
    icMethod?: 'rank' | 'normal';
  }): Promise<FactorIcResult> => apiClient.post('/api/factor/analysis/ic', params),

  /** 分层回测 */
  quantile: (params: {
    factorName: string;
    startDate: string;
    endDate: string;
    universe?: string;
    quantiles?: number;
    rebalanceDays?: number;
  }): Promise<FactorQuantileResult> => apiClient.post('/api/factor/analysis/quantile', params),

  /** 因子衰减分析 */
  decay: (params: {
    factorName: string;
    startDate: string;
    endDate: string;
    universe?: string;
    periods?: number[];
  }): Promise<FactorDecayResult> => apiClient.post('/api/factor/analysis/decay', params),

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
    /** 综合分配置（BE-8） */
    scoreConfig?: FactorScoreConfig;
    /** 交易约束（Q6） */
    tradeConstraints?: FactorScreeningTradeConstraints;
    /** 是否要求后端返回 summary（BE-2） */
    withSummary?: boolean;
    /** 是否要求后端返回 conditionPassCounts（BE-3） */
    withConditionPassCounts?: boolean;
    /** 是否要求后端返回 diagnostics（BE-9） */
    withDiagnostics?: boolean;
    /** 复用条件快照（分页 / 回测共享，BE-6） */
    requestId?: string;
  }): Promise<FactorScreeningResult> => apiClient.post('/api/factor/screening', params),
};

// ─── 保存为策略 / 优化类型 ────────────────────────────────────

export type SaveAsStrategyRequest = {
  conditions: FactorCondition[];
  universe?: string;
  weightMethod?: 'equal_weight' | 'factor_weight';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  topN?: number;
  initialCapital?: number;
  rebalanceDays?: number;
  commissionRate?: number;
  slippageBps?: number;
  benchmarkCode?: string;
  name: string;
  description?: string;
  tags?: string[];
};

export type SaveAsStrategyResponse = {
  strategyId: string;
  strategyName: string;
  version: number;
  createdAt: string;
};

export type OptimizationMode = 'MVO' | 'MIN_VARIANCE' | 'RISK_PARITY' | 'MAX_DIVERSIFICATION';

export type FactorOptimizationRequest = {
  tsCodes: string[];
  mode: OptimizationMode;
  lookbackDays?: number;
  riskAversionLambda?: number;
  maxWeight?: number;
  minWeight?: number;
  enableLeverageConstraint?: boolean;
  /** BE-4：协方差估计方式，未上线前下拉灰显 */
  covMethod?: 'sample' | 'ledoit_wolf' | 'ewma';
  /** BE-3：基准指数代码，用于 alpha/beta/TE */
  benchmarkCode?: string;
};

export type OptimizationWeightItem = {
  tsCode: string;
  stockName: string | null;
  weight: number;
};

export type SectorExposureItem = {
  industry: string;
  weight: number;
};

export type RiskContributionItem = {
  tsCode: string;
  /** 边际风险贡献（绝对值） */
  mrc: number;
  /** 占总风险比例 ∈[0,1] */
  pct: number;
};

export type BenchmarkComparison = {
  benchmarkCode: string;
  alpha: number | null;
  beta: number | null;
  trackingError: number | null;
};

export type FactorOptimizationResponse = {
  mode: OptimizationMode;
  weights: OptimizationWeightItem[];
  expectedReturn: number | null;
  expectedVolatility: number | null;
  sharpeRatio: number | null;
  /** BE-3 */
  sectorExposure?: SectorExposureItem[];
  /** BE-3 */
  riskContribution?: RiskContributionItem[];
  /** BE-3 */
  benchmarkComparison?: BenchmarkComparison;
  /** BE-3：被剔除的样本（停牌过多等） */
  excludedTsCodes?: Array<{ tsCode: string; reason: string }>;
  /** BE-4：实际使用的协方差估计方式 */
  covMethodUsed?: string;
};

// ─── 保存为策略 / 优化 API ────────────────────────────────────

export function saveFactorAsStrategy(dto: SaveAsStrategyRequest) {
  return apiClient.post<SaveAsStrategyResponse>('/api/factor/backtest/save-as-strategy', dto);
}

export function optimizeFactorPortfolio(dto: FactorOptimizationRequest) {
  return apiClient.post<FactorOptimizationResponse>('/api/factor/optimization', dto);
}

// ─── 自定义因子类型 ───────────────────────────────────────────

export type CustomFactorCreateRequest = {
  name: string;
  label: string;
  description?: string;
  category: FactorCategory;
  expression: string;
  autoPrecompute?: boolean;
};

export type CustomFactorCreateResponse = {
  id: string;
  name: string;
  label: string;
  category: FactorCategory;
  sourceType: FactorSourceType;
  expression: string;
  createdAt: string;
};

export type CustomFactorTestRequest = {
  expression: string;
  tradeDate: string;
  universe?: string;
};

export type CustomFactorTestResponse = {
  expression: string;
  tradeDate: string;
  samples: Array<{ tsCode: string; name: string; value: number | null }>;
  stats: { count: number; nonNull: number; mean: number | null; stdDev: number | null };
};

export type CustomFactorUpdateRequest = {
  name: string;
  label?: string;
  description?: string;
  category?: FactorCategory;
  expression?: string;
  autoPrecompute?: boolean;
  isEnabled?: boolean;
};

export type CustomFactorPrecomputeResponse = {
  factorId: string;
  factorName: string;
  status: string;
  message: string;
};

export type CustomFactorPrecomputeRequest = {
  name: string;
  /** 目标交易日 YYYYMMDD（后端必填） */
  tradeDate: string;
};

// ─── 因子回测类型 ─────────────────────────────────────────────

export type FactorBacktestSubmitRequest = {
  conditions: FactorCondition[];
  universe?: string;
  startDate: string;
  endDate: string;
  initialCapital?: number;
  rebalanceDays?: number;
  weightMethod?: 'equal_weight' | 'factor_weight';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  topN?: number;
  commissionRate?: number;
  slippageBps?: number;
  benchmarkCode?: string;
  name?: string;
};

export type FactorBacktestSubmitResponse = {
  runId: string;
  factorName: string;
  status: string;
  createdAt: string;
};

export type FactorAttributionRequest = {
  /** Controller DTO 字段名；服务层再映射为 backtestId。 */
  id: string;
  factorNames?: string[];
};

export type FactorAttributionItem = {
  factorName: string;
  factorLabel: string;
  allocation: number;
  selection: number;
  interaction: number;
  total: number;
};

export type FactorAttributionResponse = {
  runId: string;
  benchmarkTsCode: string;
  totalExcess: number;
  items: FactorAttributionItem[];
};

// ─── 高级分析类型 ─────────────────────────────────────────────

export type OrthogonalizeRequest = {
  factorNames: string[];
  tradeDate: string;
  universe?: string;
  /** 'gram-schmidt' 见 BE-1，未上线前下拉灰显 */
  method?: 'regression' | 'symmetric' | 'gram-schmidt';
};

export type OrthogonalizeResult = {
  tradeDate: string;
  method: string;
  factors: string[];
  correlationBefore: number[][];
  correlationAfter: number[][];
  /** BE-1：每个因子在正交化后保留下来的方差占比 ∈[0,1] */
  residualVarianceRatio?: number[];
};

export type FamaMacBethRequest = {
  factorNames: string[];
  startDate: string;
  endDate: string;
  universe?: string;
  forwardDays?: number;
  /** BE-2：Newey-West lag；0 走 OLS-t，缺省走 forwardDays */
  neweyWestLag?: number;
};

export type FamaMacBethFactorResult = {
  factorName: string;
  factorLabel: string;
  avgCoeff: number;
  tStat: number;
  pValue: number;
  significant: boolean;
  /** BE-2 */
  tStatNW?: number | null;
  /** BE-2 */
  pValueNW?: number | null;
};

export type FamaMacBethSeriesPoint = {
  date: string;
  rSquared: number;
  coeffs: Record<string, number>;
};

export type FamaMacBethResponse = {
  startDate: string;
  endDate: string;
  forwardDays: number;
  rSquaredMean: number;
  factors: FamaMacBethFactorResult[];
  /** BE-2：每个截面交易日的 R² 与系数序列 */
  seriesPerDate?: FamaMacBethSeriesPoint[];
};

// ─── Admin 类型 ───────────────────────────────────────────────

export type AdminPrecomputeRequest = {
  factorNames?: string[];
  /** 目标交易日 YYYYMMDD（必填） */
  tradeDate: string;
};

export type AdminPrecomputeResponse = {
  tradeDate: string;
  factorsProcessed: number;
  factorsFailed: number;
  totalRows: number;
  elapsedMs: number;
  /** 兼容旧面板；管理 v3 不消费异步任务字段。 */
  jobId?: string;
  status?: string;
  message?: string;
};

export type AdminBackfillRequest = {
  factorNames: string[];
  startDate: string;
  endDate: string;
  /** 跳过已存在快照数据的日期（默认 true） */
  skipExisting?: boolean;
};

export type AdminBackfillResponse = {
  startDate: string;
  endDate: string;
  datesProcessed: number;
  datesSkipped: number;
  totalRows: number;
  elapsedMs: number;
  /** 兼容旧面板；管理 v3 不消费异步任务字段。 */
  jobId?: string;
  status?: string;
  message?: string;
};

/** BE-5 扩展：状态表 item 增加运维字段 */
export type PrecomputeStatusItem = {
  factorName: string;
  factorLabel: string;
  lastComputeDate: string | null;
  rowCount: number;
  /** 前端原有枚举：UP_TO_DATE / STALE / FAILED / NEVER / RUNNING */
  status: string;
  /** BE-5 扩展 */
  category?: FactorCategory;
  sourceType?: FactorSourceType;
  isEnabled?: boolean;
  /** 覆盖度 0~1（nonNull / universeSize） */
  coverageRate?: number | null;
  /** 距今滞后交易日数（后端基于交易日历计算） */
  staleDays?: number | null;
  firstComputeDate?: string | null;
  failureReason?: string | null;
};

export type AdminPrecomputeStatusResponse = {
  items: PrecomputeStatusItem[];
  targetTradeDate: string | null;
};

// ─── Admin 日期批次类型 ─────────────────────────────────────

export type AdminJobType = 'PRECOMPUTE' | 'BACKFILL';

export type AdminJobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'CANCELLED';

export type AdminBatchStatus = 'HEALTHY' | 'STALE' | 'OLD';

export type AdminJobItem = {
  jobId: string;
  tradeDate: string;
  type: 'FACTOR_PRECOMPUTE';
  factorCount: number;
  totalStocks: number;
  missingStocks: number;
  coverageRate: number;
  status: AdminBatchStatus;
  operator: string;
  createdAt: string | null;
  latestSyncedAt: string | null;
};

export type AdminJobListRequest = {
  page: number;
  pageSize: number;
};

export type AdminJobListResponse = {
  items: AdminJobItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminJobDetailItem = {
  factorName: string;
  totalStocks: number;
  missingStocks: number;
  coverageRate: number;
  syncedAt: string | null;
  status: 'OK' | 'LOW_COVERAGE' | 'FAILED';
};

export type AdminJobDetailResponse = {
  tradeDate: string;
  factorCount: number;
  items: AdminJobDetailItem[];
};

// ─── Admin Audit 类型（BE-7） ────────────────────────────────

export type AdminAuditAction =
  | 'PRECOMPUTE'
  | 'BACKFILL'
  | 'TOGGLE_ENABLE'
  | 'TOGGLE_DISABLE'
  | 'JOB_CANCEL'
  | 'JOB_RETRY';

export type AdminAuditItem = {
  createdAt: string;
  operator: string;
  action: AdminAuditAction;
  factorNames: string[];
  ip?: string | null;
  success: boolean;
  message?: string | null;
};

export type AdminAuditRequest = {
  startDate?: string;
  endDate?: string;
  operatorId?: string;
  action?: AdminAuditAction;
  page: number;
  pageSize: number;
};

export type AdminAuditResponse = {
  items: AdminAuditItem[];
  total: number;
};

// ─── Admin Schedule 类型（BE-8） ─────────────────────────────

export type AdminScheduleResponse = {
  items: never[];
  total: number;
};

// ─── 自定义因子 API ───────────────────────────────────────────

export function createCustomFactor(dto: CustomFactorCreateRequest) {
  return apiClient.post<CustomFactorCreateResponse>('/api/factor/custom/create', dto);
}

export function testCustomExpression(dto: CustomFactorTestRequest) {
  return apiClient.post<CustomFactorTestResponse>('/api/factor/custom/test', dto);
}

export function updateCustomFactor(dto: CustomFactorUpdateRequest) {
  return apiClient.post<CustomFactorCreateResponse>('/api/factor/custom/update', dto);
}

export function deleteCustomFactor(query: { name: string }) {
  return apiClient.post<{ message: string }>('/api/factor/custom/delete', query);
}

export function precomputeCustomFactor(dto: CustomFactorPrecomputeRequest) {
  return apiClient.post<CustomFactorPrecomputeResponse>('/api/factor/custom/precompute', dto);
}

// ─── 因子回测 API ─────────────────────────────────────────────

export function submitFactorBacktest(dto: FactorBacktestSubmitRequest) {
  return apiClient.post<FactorBacktestSubmitResponse>('/api/factor/backtest/submit', dto);
}

export function getFactorAttribution(dto: FactorAttributionRequest) {
  return apiClient.post<FactorAttributionResponse>('/api/factor/backtest/attribution', dto);
}

// ─── 高级分析 API ─────────────────────────────────────────────

export function orthogonalizeFactors(dto: OrthogonalizeRequest) {
  return apiClient.post<OrthogonalizeResult>('/api/factor/analysis/orthogonalize', dto);
}

export function famaMacBeth(dto: FamaMacBethRequest) {
  return apiClient.post<FamaMacBethResponse>('/api/factor/analysis/fama-macbeth', dto);
}

// ─── Admin API ────────────────────────────────────────────────

export function adminPrecompute(dto: AdminPrecomputeRequest) {
  return apiClient.post<AdminPrecomputeResponse>('/api/factor/admin/precompute', dto);
}

export function adminBackfill(dto: AdminBackfillRequest) {
  return apiClient.post<AdminBackfillResponse>('/api/factor/admin/backfill', dto);
}

export async function adminPrecomputeStatus(): Promise<AdminPrecomputeStatusResponse> {
  const raw = await apiClient.post<unknown>('/api/factor/admin/precompute/status', {});
  const obj = (raw ?? {}) as Record<string, unknown>;
  const targetTradeDate =
    typeof obj.latestTradeDate === 'string' && /^\d{8}$/.test(obj.latestTradeDate)
      ? obj.latestTradeDate
      : null;
  if (Array.isArray(obj.items)) {
    return { items: obj.items as PrecomputeStatusItem[], targetTradeDate };
  }
  const byFactor = Array.isArray(obj.byFactor)
    ? (obj.byFactor as Array<Record<string, unknown>>)
    : [];
  const items: PrecomputeStatusItem[] = byFactor.map((row) => {
    const factorName = String(row.factorName ?? '');
    const latestDate =
      typeof row.latestDate === 'string' && /^\d{8}$/.test(row.latestDate)
        ? row.latestDate
        : null;
    const totalDates = Number(row.totalDates ?? 0);
    const rawStaleDays = row.staleDays == null ? Number.NaN : Number(row.staleDays);
    const staleDays = Number.isFinite(rawStaleDays) && rawStaleDays >= 0 ? rawStaleDays : null;
    const status = !latestDate
      ? 'NEVER'
      : staleDays != null
        ? staleDays <= 5
          ? 'UP_TO_DATE'
          : 'STALE'
        : latestDate === targetTradeDate
          ? 'UP_TO_DATE'
          : 'STALE';
    return {
      factorName,
      factorLabel: String(row.factorLabel ?? factorName),
      lastComputeDate: latestDate,
      rowCount: totalDates,
      status,
      staleDays,
      coverageRate: null,
      firstComputeDate: null,
      failureReason: null,
    };
  });
  return { items, targetTradeDate };
}

export function adminJobList(dto: AdminJobListRequest) {
  return apiClient.post<AdminJobListResponse>('/api/factor/admin/jobs', dto);
}

export function adminJobDetail(dto: { tradeDate: string }) {
  return apiClient.post<AdminJobDetailResponse>('/api/factor/admin/jobs/detail', dto);
}

/** BE-7：审计日志 */
export function adminAuditLog(dto: AdminAuditRequest) {
  return apiClient.post<AdminAuditResponse>('/api/factor/admin/audit', dto);
}

/** BE-8：调度配置（只读） */
export function adminScheduleInfo() {
  return apiClient.post<AdminScheduleResponse>('/api/factor/admin/schedule', {});
}

// ─── 批量预计算（BE-3，端点未就绪时调用方退化为串行） ────────────

export type BatchPrecomputeRequest = {
  factorNames: string[];
  tradeDate?: string;
};

export type BatchPrecomputeItem = {
  factorName: string;
  status: string;
  message?: string;
};

export type BatchPrecomputeResponse = {
  jobId?: string;
  items: BatchPrecomputeItem[];
};

export function batchPrecomputeFactors(dto: BatchPrecomputeRequest) {
  return apiClient.post<BatchPrecomputeResponse>('/api/factor/admin/precompute-batch', dto);
}
