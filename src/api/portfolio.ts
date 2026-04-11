import { apiClient } from './client';

// ---- 枚举 ----

export type PortfolioRiskRuleType =
  | 'MAX_SINGLE_POSITION'
  | 'MAX_INDUSTRY_WEIGHT'
  | 'MAX_DRAWDOWN_STOP';

// ---- 组合类型 ----

export type PortfolioCreated = {
  id: string;
  name: string;
  initialCash: number;
  description: string | null;
  createdAt: string;
};

export type PortfolioListItem = {
  id: string;
  name: string;
  description: string | null;
  initialCash: number;
  holdingCount: number;
  createdAt: string;
  updatedAt: string;
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
  todayPnl: number;
  todayPnlPct: number;
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

export type MarketCapBucket = {
  label: string;
  count: number;
  weight: number | null;
};

export type MarketCapDistribution = {
  tradeDate: string | null;
  buckets: MarketCapBucket[];
};

export type BetaHoldingItem = {
  tsCode: string;
  stockName: string;
  beta: number | null;
  weight: number | null;
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
  memo: string | null;
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

export type AddHoldingRequest = {
  portfolioId: string;
  tsCode: string;
  quantity: number;
  avgCost: number;
};

export type UpdateHoldingRequest = {
  holdingId: string;
  quantity: number;
  avgCost: number;
};

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
  memo?: string;
};

export type UpdateRiskRuleRequest = {
  ruleId: string;
  threshold: number;
  isEnabled: boolean;
  memo?: string;
};

// ---- API 函数 ----

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

export function addHolding(data: AddHoldingRequest) {
  return apiClient.post<HoldingDetailItem>('/api/portfolio/holding/add', data);
}

export function updateHolding(data: UpdateHoldingRequest) {
  return apiClient.post<HoldingDetailItem>('/api/portfolio/holding/update', data);
}

export function removeHolding(query: { holdingId: string }) {
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
