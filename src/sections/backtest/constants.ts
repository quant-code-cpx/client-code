import type { BacktestRunForm } from './types';

// ----------------------------------------------------------------------

export const BENCHMARK_OPTIONS = [
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
  { label: '上证指数', value: '000001.SH' },
  { label: '深证成指', value: '399001.SZ' },
];

export const UNIVERSE_OPTIONS = [
  { label: '全市场', value: 'ALL_A' },
  { label: '沪深300', value: 'HS300' },
  { label: '中证500', value: 'CSI500' },
  { label: '中证1000', value: 'CSI1000' },
  { label: '上证50', value: 'SSE50' },
  { label: '自定义股票池', value: 'CUSTOM' },
];

export const REBALANCE_FREQUENCY_OPTIONS = [
  { label: '日', value: 'DAILY' },
  { label: '周', value: 'WEEKLY' },
  { label: '月', value: 'MONTHLY' },
  { label: '季', value: 'QUARTERLY' },
];

export const PRICE_MODE_OPTIONS = [
  { label: '次日开盘', value: 'NEXT_OPEN' },
  { label: '次日收盘', value: 'NEXT_CLOSE' },
];

export const RANK_BY_OPTIONS = [
  { label: '总市值', value: 'totalMv' },
  { label: 'PE(TTM)', value: 'peTtm' },
  { label: 'PB', value: 'pb' },
  { label: '股息率(TTM)', value: 'dvTtm' },
  { label: '换手率', value: 'turnoverRate' },
  { label: '换手率(自由流通)', value: 'turnoverRateF' },
];

export const WEIGHT_MODE_OPTIONS = [
  { label: '等权', value: 'EQUAL' },
  { label: '自定义权重', value: 'CUSTOM' },
];

export const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '排队中', value: 'QUEUED' },
  { label: '运行中', value: 'RUNNING' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已失败', value: 'FAILED' },
  { label: '已取消', value: 'CANCELLED' },
];

export const STRATEGY_TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '均线择时', value: 'MA_CROSS_SINGLE' },
  { label: '选股轮动', value: 'SCREENING_ROTATION' },
  { label: '因子排序', value: 'FACTOR_RANKING' },
  { label: '自定义股票池', value: 'CUSTOM_POOL_REBALANCE' },
];

export const STRATEGY_TYPE_LABEL: Record<string, string> = {
  MA_CROSS_SINGLE: '均线择时',
  SCREENING_ROTATION: '选股轮动',
  FACTOR_RANKING: '因子排序',
  CUSTOM_POOL_REBALANCE: '自定义股票池',
};

export const STATUS_COLOR: Record<
  string,
  'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
> = {
  QUEUED: 'default',
  RUNNING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'warning',
};

export const STATUS_LABEL: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '运行中',
  COMPLETED: '已完成',
  FAILED: '已失败',
  CANCELLED: '已取消',
};

export const DEFAULT_FORM: BacktestRunForm = {
  name: '',
  startDate: '2020-01-01',
  endDate: '2024-12-31',
  initialCapital: 1000000,
  benchmarkTsCode: '000300.SH',
  universe: 'HS300',
  customUniverseTsCodes: [],
  rebalanceFrequency: 'MONTHLY',
  priceMode: 'NEXT_OPEN',
  enableTradeConstraints: true,
  commissionRate: 0.0003,
  stampDutyRate: 0.0005,
  minCommission: 5,
  slippageBps: 5,
  maxPositions: 20,
  maxWeightPerStock: 0.1,
  minDaysListed: 60,
  strategyConfig: {},
};

export const DEFAULT_MA_CONFIG = {
  tsCode: '',
  shortWindow: 5,
  longWindow: 20,
  allowFlat: false,
};

export const DEFAULT_SCREENING_CONFIG = {
  rankBy: 'totalMv',
  rankOrder: 'desc' as const,
  topN: 20,
  minDaysListed: 60,
};

export const DEFAULT_FACTOR_CONFIG = {
  factorName: '',
  rankOrder: 'desc' as const,
  topN: 20,
};

export const DEFAULT_CUSTOM_POOL_CONFIG = {
  tsCodes: [] as string[],
  weightMode: 'EQUAL' as const,
  customWeights: [] as Array<{ tsCode: string; weight: number }>,
};

export const OPTIMIZE_METRIC_OPTIONS = [
  { label: '夏普比率', value: 'sharpeRatio' },
  { label: '年化收益', value: 'annualizedReturn' },
  { label: 'Calmar 比率', value: 'calmarRatio' },
  { label: '最大回撤 (最小化)', value: 'maxDrawdown' },
];

export const PARAM_SEARCH_TYPE_OPTIONS = [
  { label: '区间搜索', value: 'range' },
  { label: '枚举搜索', value: 'enum' },
];

export const DEFAULT_WF_FORM = {
  name: '',
  baseStrategyType: 'SCREENING_ROTATION' as string,
  baseStrategyConfig: {} as Record<string, unknown>,
  paramSearchSpace: {} as Record<
    string,
    {
      type: 'range' | 'enum';
      min?: number;
      max?: number;
      step?: number;
      values?: (string | number | boolean)[];
    }
  >,
  fullStartDate: '2018-01-01',
  fullEndDate: '2024-12-31',
  inSampleDays: 252,
  outOfSampleDays: 63,
  stepDays: 63,
  optimizeMetric: 'sharpeRatio',
  benchmarkTsCode: '000300.SH',
  universe: 'HS300',
  initialCapital: 1000000,
  rebalanceFrequency: 'MONTHLY',
};

export const DEFAULT_ROLLING_FORM = {
  name: '',
  strategyType: 'SCREENING_ROTATION' as string,
  strategyConfig: {} as Record<string, unknown>,
  rollingParamSpace: {} as Record<
    string,
    {
      type: 'range' | 'enum';
      min?: number;
      max?: number;
      step?: number;
      values?: (string | number | boolean)[];
    }
  >,
  startDate: '2018-01-01',
  endDate: '2024-12-31',
  lookbackDays: 252,
  holdingPeriodDays: 63,
  optimizeMetric: 'sharpeRatio',
  benchmarkTsCode: '000300.SH',
  universe: 'HS300',
  initialCapital: 1000000,
  rebalanceFrequency: 'MONTHLY',
};

export const DEFAULT_COMPARISON_STRATEGY = {
  label: '',
  strategyType: 'SCREENING_ROTATION' as string,
  strategyConfig: {} as Record<string, unknown>,
  rebalanceFrequency: 'MONTHLY',
};
