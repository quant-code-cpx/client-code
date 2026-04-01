// Backtest section local types (form state, UI state)
// API types are imported from src/api/backtest.ts

export type BacktestRunForm = {
  name: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  benchmarkTsCode: string;
  universe: string;
  customUniverseTsCodes: string[];
  rebalanceFrequency: string;
  priceMode: string;
  enableTradeConstraints: boolean;
  commissionRate: number;
  stampDutyRate: number;
  minCommission: number;
  slippageBps: number;
  maxPositions: number;
  maxWeightPerStock: number;
  minDaysListed: number;
  strategyConfig: Record<string, unknown>;
};

// MA Cross strategy config
export type MaCrossConfig = {
  tsCode: string;
  shortPeriod: number;
  longPeriod: number;
  allowShort: boolean;
};

// Screening rotation strategy config
export type ScreeningRotationConfig = {
  rankBy: string;
  rankOrder: 'asc' | 'desc';
  topN: number;
  weightMode: 'equal' | 'rank';
  industry?: string;
  minPe?: number;
  maxPe?: number;
  minPb?: number;
  maxPb?: number;
  minRoe?: number;
  minMv?: number;
  maxMv?: number;
};

// Factor ranking strategy config
export type FactorRankingConfig = {
  factorName: string;
  rankOrder: 'asc' | 'desc';
  topN: number;
  layers?: number;
  minMv?: number;
  minTurnoverRate?: number;
  maxPe?: number;
};

// Custom pool strategy config
export type CustomPoolConfig = {
  tsCodes: string[];
  weightMode: 'equal' | 'custom';
  weights: Record<string, number>;
};
