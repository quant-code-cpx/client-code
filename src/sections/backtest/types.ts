// Backtest section local types (form state, UI state)
// API types are imported from src/api/backtest.ts

export type StrategyTemplateId =
  | 'MA_CROSS_SINGLE'
  | 'SCREENING_ROTATION'
  | 'FACTOR_RANKING'
  | 'CUSTOM_POOL_REBALANCE'
  | 'FACTOR_SCREENING_ROTATION';

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
  enableT1Restriction: boolean;
  partialFillEnabled: boolean;
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

export type StrategyConfigByTemplate = {
  MA_CROSS_SINGLE: MaCrossConfig;
  SCREENING_ROTATION: ScreeningRotationConfig;
  FACTOR_RANKING: FactorRankingConfig;
  CUSTOM_POOL_REBALANCE: CustomPoolConfig;
  FACTOR_SCREENING_ROTATION: ScreeningRotationConfig;
};

export type StrategyConfig = StrategyConfigByTemplate[StrategyTemplateId];

// Walk-Forward / Rolling create form state
export type ParamSearchSpaceItemLocal = {
  type: 'range' | 'enum';
  min?: number;
  max?: number;
  step?: number;
  values?: (string | number | boolean)[];
};

export type CreateWalkForwardFormState = {
  name: string;
  mode: 'WF' | 'ROLLING';
  windowMode: 'ROLLING' | 'ANCHORED' | 'EXPANDING';
  baseStrategyType: string;
  baseStrategyConfig: Record<string, unknown>;
  paramSearchSpace: Record<string, ParamSearchSpaceItemLocal>;
  fullStartDate: string;
  fullEndDate: string;
  inSampleDays: number;
  outOfSampleDays: number;
  stepDays: number;
  optimizeMetric: string;
  benchmarkTsCode: string;
  universe: string;
  initialCapital: number;
  rebalanceFrequency: string;
  purgeDays: number;
  embargoDays: number;
  minOosTrades: number;
};

export type CreateRollingFormState = {
  name: string;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  rollingParamSpace: Record<string, ParamSearchSpaceItemLocal>;
  startDate: string;
  endDate: string;
  lookbackDays: number;
  holdingPeriodDays: number;
  optimizeMetric: string;
  benchmarkTsCode: string;
  universe: string;
  initialCapital: number;
  rebalanceFrequency: string;
};

// Comparison create form state
export type ComparisonStrategyFormItem = {
  label: string;
  strategyType: string;
  strategyConfig: Record<string, unknown>;
  rebalanceFrequency: string;
};

export type CreateComparisonFormState = {
  name: string;
  strategies: ComparisonStrategyFormItem[];
  startDate: string;
  endDate: string;
  benchmarkTsCode: string;
  universe: string;
  initialCapital: number;
};
