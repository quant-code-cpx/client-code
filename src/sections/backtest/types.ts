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
  shortWindow: number;
  longWindow: number;
  allowFlat: boolean;
};

// Screening rotation strategy config
export type ScreeningRotationConfig = {
  rankBy: string;
  rankOrder: 'asc' | 'desc';
  topN: number;
  minDaysListed?: number;
};

// Factor ranking strategy config
export type FactorRankingConfig = {
  factorName: string;
  rankOrder: 'asc' | 'desc';
  topN: number;
  minDaysListed?: number;
  optionalFilters?: {
    minTotalMv?: number;
    minTurnoverRate?: number;
    maxPeTtm?: number;
  };
};

// Custom pool strategy config
export type CustomPoolConfig = {
  tsCodes: string[];
  weightMode: 'EQUAL' | 'CUSTOM';
  customWeights: Array<{ tsCode: string; weight: number }>;
};
