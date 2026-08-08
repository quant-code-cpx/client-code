import { apiClient } from './client';

// ---- 枚举 ----

export type PortfolioRiskRuleType =
  | 'MAX_SINGLE_POSITION'
  | 'MAX_INDUSTRY_WEIGHT'
  | 'MAX_DRAWDOWN_STOP';

export type PortfolioKind = 'PAPER' | 'LIVE';

export type PortfolioSparklinePoint = {
  date: string;
  nav: number | null;
};

// ---- 组合类型 ----

export type PortfolioCreated = {
  id: string;
  name: string;
  initialCash: number;
  description: string | null;
  createdAt: string;
  kind?: PortfolioKind;
  isArchived?: boolean;
  lastUpdated?: string | null;
};

export type PortfolioListItem = {
  id: string;
  name: string;
  description: string | null;
  initialCash: number;
  holdingCount: number;
  createdAt: string;
  updatedAt: string;
  kind?: PortfolioKind;
  todayPnl?: number | null;
  todayPnlPct?: number | null;
  isArchived?: boolean;
  lastUpdated?: string | null;
  isTradingDay?: boolean;
  totalMarketValue?: number | null;
  cumulativeReturn?: number | null;
  sparkline?: PortfolioSparklinePoint[];
};

export type PortfolioUpdated = {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
};

// ---- 持仓类型 ----

export type HoldingDetailItem = {
  id: string;
  tsCode: string;
  stockName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  pnlPct: number | null;
  weight: number | null;
  industry: string | null;
};

export type PortfolioSummary = {
  totalCost: number;
  totalMarketValue: number;
  totalUnrealizedPnl: number;
  totalPnlPct: number;
  cashBalance: number;
  todayPnl?: number | null;
  todayPnlPct?: number | null;
  lastUpdated?: string | null;
  isTradingDay?: boolean;
  cumulativeReturn?: number | null;
};

export type PortfolioDetail = {
  portfolio: PortfolioCreated;
  holdings: HoldingDetailItem[];
  summary: PortfolioSummary;
};

// ---- 盈亏类型 ----

export type PnlByHoldingItem = {
  tsCode: string;
  stockName: string;
  pctChg: number | null;
  todayPnl: number | null;
};

export type PnlToday = {
  tradeDate: string | null;
  todayPnl: number | null;
  todayPnlPct: number | null;
  isTradingDay?: boolean;
  lastUpdated?: string | null;
  byHolding: PnlByHoldingItem[];
};

export type PnlHistoryItem = {
  date: string;
  marketValue: number;
  costBasis: number;
  nav: number | null;
};

// ---- 风险分析类型 ----

export type IndustryDistributionItem = {
  industry: string;
  stockCount: number;
  totalMarketValue: number | null;
  weight: number | null;
};

export type IndustryDistribution = {
  tradeDate: string | null;
  industries: IndustryDistributionItem[];
};

export type PositionItem = {
  tsCode: string;
  stockName: string;
  marketValue: number | null;
  weight: number | null;
};

export type Concentration = {
  hhi: number;
  top1Weight: number;
  top3Weight: number;
  top5Weight: number;
};

export type PositionConcentration = {
  tradeDate: string | null;
  positions: PositionItem[];
  concentration: Concentration;
};

export type MarketCapTier = {
  tier: string;
  stockCount: number;
  weight: number | null;
};

export type MarketCapDistribution = {
  tradeDate: string | null;
  tiers: MarketCapTier[];
};

export type BetaHoldingItem = {
  tsCode: string;
  stockName: string;
  beta: number | null;
  weight?: number | null;
};

export type BetaAnalysis = {
  tradeDate: string | null;
  portfolioBeta: number | null;
  holdings: BetaHoldingItem[];
};

// ---- 风控规则类型 ----

export type RiskRule = {
  id: string;
  portfolioId: string;
  ruleType: string;
  threshold: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ViolationItem = {
  ruleType: string;
  tsCode: string | null;
  stockName: string | null;
  currentValue: number;
  threshold: number;
  message: string;
};

export type RiskCheckResult = {
  portfolioId: string;
  violations: ViolationItem[];
  checkedAt: string;
};

export type ViolationRecord = {
  id: string;
  portfolioId: string;
  ruleType: string;
  tsCode: string | null;
  currentValue: number;
  threshold: number;
  message: string;
  detectedAt: string;
};

// ---- 请求类型 ----

export type CreatePortfolioRequest = {
  name: string;
  description?: string;
  initialCash: number;
};

export type UpdatePortfolioRequest = {
  id: string;
  name?: string;
  description?: string;
};

export type HoldingMutationAction = 'add' | 'update' | 'remove';

type HoldingMutationRequest = {
  idempotencyKey: string;
};

export type AddHoldingInput = {
  portfolioId: string;
  tsCode: string;
  quantity: number;
  avgCost: number;
};

export type AddHoldingRequest = AddHoldingInput & HoldingMutationRequest;

export type UpdateHoldingInput = {
  holdingId: string;
  quantity: number;
  avgCost: number;
};

export type UpdateHoldingRequest = UpdateHoldingInput & HoldingMutationRequest;

export type RemoveHoldingRequest = {
  holdingId: string;
} & HoldingMutationRequest;

export type PnlHistoryRequest = {
  portfolioId: string;
  startDate: string;
  endDate: string;
};

export type CreateRiskRuleRequest = {
  portfolioId: string;
  ruleType: PortfolioRiskRuleType;
  threshold: number;
  isEnabled?: boolean;
};

export type UpdateRiskRuleRequest = {
  ruleId: string;
  threshold: number;
  isEnabled: boolean;
};

// ---- API 函数 ----

export function createHoldingMutationIdempotencyKey(action: HoldingMutationAction): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  return `portfolio-holding:${action}:${randomPart}`.slice(0, 128);
}

export function createPortfolio(data: CreatePortfolioRequest) {
  return apiClient.post<PortfolioCreated>('/api/portfolio/create', data);
}

export function listPortfolios() {
  return apiClient.post<PortfolioListItem[]>('/api/portfolio/list', {});
}

export function getPortfolioDetail(query: { portfolioId: string }) {
  return apiClient.post<PortfolioDetail>('/api/portfolio/detail', query);
}

export function updatePortfolio(data: UpdatePortfolioRequest) {
  return apiClient.post<PortfolioUpdated>('/api/portfolio/update', data);
}

export function deletePortfolio(query: { portfolioId: string }) {
  return apiClient.post<{ message: string }>('/api/portfolio/delete', query);
}

/** BE returns HoldingItemDto (subset of HoldingDetailItem); return value is not used by views */
export function addHolding(data: AddHoldingRequest) {
  return apiClient.post<
    Pick<HoldingDetailItem, 'id' | 'tsCode' | 'stockName' | 'quantity' | 'avgCost'> & {
      updatedAt: string;
    }
  >('/api/portfolio/holding/add', data);
}

/** BE returns HoldingItemDto (subset of HoldingDetailItem); return value is not used by views */
export function updateHolding(data: UpdateHoldingRequest) {
  return apiClient.post<
    Pick<HoldingDetailItem, 'id' | 'tsCode' | 'stockName' | 'quantity' | 'avgCost'> & {
      updatedAt: string;
    }
  >('/api/portfolio/holding/update', data);
}

export function removeHolding(query: RemoveHoldingRequest) {
  return apiClient.post<{ message: string }>('/api/portfolio/holding/remove', query);
}

export function getPnlToday(query: { portfolioId: string }) {
  return apiClient.post<PnlToday>('/api/portfolio/pnl/today', query);
}

export function getPnlHistory(query: PnlHistoryRequest) {
  return apiClient.post<PnlHistoryItem[]>('/api/portfolio/pnl/history', query);
}

export function getRiskIndustry(query: { portfolioId: string }) {
  return apiClient.post<IndustryDistribution>('/api/portfolio/risk/industry', query);
}

export function getRiskPosition(query: { portfolioId: string }) {
  return apiClient.post<PositionConcentration>('/api/portfolio/risk/position', query);
}

export function getRiskMarketCap(query: { portfolioId: string }) {
  return apiClient.post<MarketCapDistribution>('/api/portfolio/risk/market-cap', query);
}

export function getRiskBeta(query: { portfolioId: string }) {
  return apiClient.post<BetaAnalysis>('/api/portfolio/risk/beta', query);
}

export function listRiskRules(query: { portfolioId: string }) {
  return apiClient.post<RiskRule[]>('/api/portfolio/rule/list', query);
}

export function upsertRiskRule(data: CreateRiskRuleRequest) {
  return apiClient.post<RiskRule>('/api/portfolio/rule/upsert', data);
}

export function updateRiskRule(data: UpdateRiskRuleRequest) {
  return apiClient.post<RiskRule>('/api/portfolio/rule/update', data);
}

export function deleteRiskRule(query: { ruleId: string }) {
  return apiClient.post<{ message: string }>('/api/portfolio/rule/delete', query);
}

export function checkRisk(query: { portfolioId: string }) {
  return apiClient.post<RiskCheckResult>('/api/portfolio/risk/check', query);
}

export function getViolations(query: { portfolioId: string; limit?: number }) {
  return apiClient.post<ViolationRecord[]>('/api/portfolio/risk/violations', query);
}

// ─── 回测导入类型 ─────────────────────────────────

export type ApplyMode = 'REPLACE' | 'MERGE';

export type ApplyBacktestRequest = {
  backtestRunId: string;
  portfolioId?: string;
  portfolioName?: string;
  mode?: ApplyMode;
};

export type RebalanceAction = {
  tsCode: string;
  stockName: string;
  action: 'BUY' | 'SELL' | 'ADJUST' | 'HOLD';
  previousQuantity: number;
  previousAvgCost: number;
  targetQuantity: number;
  targetAvgCost: number;
  deltaQuantity: number;
};

export type ApplyBacktestSummary = {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  totalHoldings: number;
};

export type ApplyBacktestResponse = {
  portfolioId: string;
  portfolioName: string;
  backtestRunId: string;
  mode: ApplyMode;
  snapshotDate: string;
  changes: RebalanceAction[];
  summary: ApplyBacktestSummary;
};

// ─── 调仓清单类型 ─────────────────────────────────

export type OmitAction = 'SELL' | 'HOLD';

export type TargetItem = {
  tsCode: string;
  targetWeight: number;
};

export type RebalancePlanRequest = {
  portfolioId: string;
  targets: TargetItem[];
  omitUnspecified?: OmitAction;
  totalValue?: number;
  commissionRate?: number;
  stampDutyRate?: number;
  minCommission?: number;
};

export type RebalancePlanResponse = {
  portfolioId: string;
  totalValue: number;
  priceDate: string;
  actions: RebalanceAction[];
  estimatedCost: number;
  summary: ApplyBacktestSummary;
};

// ─── 绩效跟踪类型 ─────────────────────────────────

export type PortfolioPerformanceRequest = {
  portfolioId: string;
  startDate?: string;
  endDate?: string;
  benchmarkTsCode?: string;
};

export type PerformanceDailyItem = {
  date: string;
  portfolioNav: number;
  benchmarkNav: number;
  dailyReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
};

export type PortfolioPerformanceResponse = {
  portfolioId: string;
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  series: PerformanceDailyItem[];
  metrics: {
    totalReturn: number | null;
    annualizedReturn: number | null;
    benchmarkReturn: number | null;
    excessReturn: number | null;
    trackingError: number | null;
    informationRatio: number | null;
    maxDrawdown: number | null;
    sharpeRatio: number | null;
  };
};

// ─── 漂移检测类型 ─────────────────────────────────

export type DriftType = 'MISSING_IN_PORTFOLIO' | 'EXTRA_IN_PORTFOLIO' | 'WEIGHT_DRIFT' | 'ALIGNED';

export type DriftItem = {
  tsCode: string;
  stockName: string;
  actualWeight: number | null;
  targetWeight: number | null;
  weightDiff: number | null;
  driftType: DriftType;
};

export type IndustryDriftItem = {
  industry: string;
  actualWeight: number;
  targetWeight: number;
  diff: number;
};

export type DriftDetectionRequest = {
  portfolioId: string;
  strategyId?: string;
  alertThreshold?: number;
};

export type DriftDetectionResponse = {
  portfolioId: string;
  strategyId: string;
  tradeDate: string;
  overallDrift: number;
  isAlerting: boolean;
  alertThreshold: number;
  items: DriftItem[];
  industryDrift: IndustryDriftItem[];
};

// ─── 交易日志类型 ─────────────────────────────────

export type TradeLogQueryRequest = {
  portfolioId: string;
  startDate?: string;
  endDate?: string;
  tsCode?: string;
  action?: string;
  reason?: string;
  page?: number;
  pageSize?: number;
};

export type TradeLogSummaryRequest = {
  portfolioId: string;
  startDate?: string;
  endDate?: string;
};

export type TradeLogItem = {
  id: string;
  portfolioId: string;
  tsCode: string;
  stockName: string | null;
  action: string;
  quantity: number;
  price: number | null;
  amount: number | null;
  reason: string | null;
  tradeDate: string;
  createdAt: string;
};

export type TradeLogQueryResponse = {
  page: number;
  pageSize: number;
  total: number;
  items: TradeLogItem[];
};

export type TradeLogSummaryResponse = {
  portfolioId: string;
  totalTrades: number;
  totalBuyAmount: number | null;
  totalSellAmount: number | null;
  byAction: Array<{ action: string; count: number; totalAmount: number | null }>;
  byStock: Array<{ tsCode: string; stockName: string | null; count: number }>;
};

// ─── 新增 API 函数 ────────────────────────────────

export function applyBacktest(dto: ApplyBacktestRequest) {
  return apiClient.post<ApplyBacktestResponse>('/api/portfolio/apply-backtest', dto);
}

/** BE returns { items: RebalancePlanItemDto[], refDate, summary: RebalancePlanSummaryDto };
 *  adapter maps to FE types { actions, priceDate, estimatedCost, summary } */
export async function rebalancePlan(dto: RebalancePlanRequest): Promise<RebalancePlanResponse> {
  const res = await apiClient.post<{
    portfolioId: string;
    portfolioName: string;
    refDate: string;
    totalValue: number;
    items: Array<{
      tsCode: string;
      stockName: string;
      currentShares: number;
      currentPrice: number | null;
      currentMarketValue: number | null;
      currentWeight: number | null;
      targetWeight: number;
      targetShares: number;
      targetMarketValue: number | null;
      action: 'BUY' | 'SELL' | 'ADJUST' | 'HOLD' | 'SKIP';
      skipReason: string | null;
      deltaShares: number;
      deltaAmount: number | null;
      estimatedTradingCost: number;
    }>;
    summary: {
      totalBuyAmount: number;
      totalSellProceeds: number;
      totalTradingCost: number;
      buyCount: number;
      sellCount: number;
      adjustCount: number;
      holdCount: number;
      skipCount: number;
      cashBefore: number;
      cashAfter: number;
      isFeasible: boolean;
    };
  }>('/api/portfolio/rebalance-plan', dto);

  return {
    portfolioId: res.portfolioId,
    totalValue: res.totalValue,
    priceDate: res.refDate,
    estimatedCost: res.summary?.totalTradingCost ?? 0,
    actions: (res.items ?? []).map((it) => ({
      tsCode: it.tsCode,
      stockName: it.stockName,
      action: it.action === 'SKIP' ? 'HOLD' : it.action,
      previousQuantity: it.currentShares,
      previousAvgCost: 0,
      targetQuantity: it.targetShares,
      targetAvgCost: 0,
      deltaQuantity: it.deltaShares,
    })),
    summary: {
      added: res.summary?.buyCount ?? 0,
      updated: res.summary?.adjustCount ?? 0,
      removed: res.summary?.sellCount ?? 0,
      unchanged: res.summary?.holdCount ?? 0,
      totalHoldings:
        (res.summary?.buyCount ?? 0) +
        (res.summary?.adjustCount ?? 0) +
        (res.summary?.holdCount ?? 0),
    },
  };
}

/** BE returns { dailySeries, metrics: { benchmarkTotalReturn, cumulativeExcessReturn, ... } };
 *  adapter renames to match FE convention used by views */
export async function getPerformance(
  dto: PortfolioPerformanceRequest
): Promise<PortfolioPerformanceResponse> {
  const res = await apiClient.post<{
    portfolioId: string;
    startDate: string;
    endDate: string;
    benchmarkTsCode: string;
    dailySeries: PerformanceDailyItem[];
    metrics: {
      totalReturn: number | null;
      annualizedReturn: number | null;
      benchmarkTotalReturn: number | null;
      cumulativeExcessReturn: number | null;
      annualizedVolatility: number | null;
      trackingError: number | null;
      informationRatio: number | null;
      maxDrawdown: number | null;
      sharpeRatio: number | null;
    };
  }>('/api/portfolio/performance', dto);

  return {
    portfolioId: res.portfolioId,
    startDate: res.startDate,
    endDate: res.endDate,
    benchmarkTsCode: res.benchmarkTsCode,
    series: res.dailySeries ?? [],
    metrics: {
      totalReturn: res.metrics.totalReturn,
      annualizedReturn: res.metrics.annualizedReturn,
      benchmarkReturn: res.metrics.benchmarkTotalReturn,
      excessReturn: res.metrics.cumulativeExcessReturn,
      trackingError: res.metrics.trackingError,
      informationRatio: res.metrics.informationRatio,
      maxDrawdown: res.metrics.maxDrawdown,
      sharpeRatio: res.metrics.sharpeRatio,
    },
  };
}

/** BE returns { totalDriftScore, isAlert, industryItems, ... };
 *  adapter renames to FE convention { overallDrift, isAlerting, industryDrift } */
export async function detectDrift(dto: DriftDetectionRequest): Promise<DriftDetectionResponse> {
  const res = await apiClient.post<{
    portfolioId: string;
    strategyId: string;
    tradeDate: string;
    totalDriftScore: number;
    isAlert: boolean;
    alertThreshold: number;
    positionDrift: number;
    weightDrift: number;
    industryDrift: number;
    items: DriftItem[];
    industryItems: IndustryDriftItem[];
  }>('/api/portfolio/drift-detection', dto);

  return {
    portfolioId: res.portfolioId,
    strategyId: res.strategyId,
    tradeDate: res.tradeDate,
    overallDrift: res.totalDriftScore,
    isAlerting: res.isAlert,
    alertThreshold: res.alertThreshold,
    items: res.items ?? [],
    industryDrift: res.industryItems ?? [],
  };
}

export function queryTradeLog(dto: TradeLogQueryRequest) {
  return apiClient.post<TradeLogQueryResponse>('/api/portfolio/trade-log', dto);
}

export function tradeLogSummary(dto: TradeLogSummaryRequest) {
  return apiClient.post<TradeLogSummaryResponse>('/api/portfolio/trade-log/summary', dto);
}
