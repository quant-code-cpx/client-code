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
  { label: '全市场', value: 'ALL' },
  { label: '沪深300', value: 'HS300' },
  { label: '中证500', value: 'ZZ500' },
  { label: '中证1000', value: 'ZZ1000' },
  { label: '上证50', value: 'SZ50' },
  { label: '自定义股票池', value: 'CUSTOM' },
];

export const REBALANCE_FREQUENCY_OPTIONS = [
  { label: '日', value: 'daily' },
  { label: '周', value: 'weekly' },
  { label: '月', value: 'monthly' },
  { label: '季', value: 'quarterly' },
];

export const PRICE_MODE_OPTIONS = [
  { label: '次日开盘', value: 'next_open' },
  { label: '次日收盘', value: 'next_close' },
];

export const RANK_BY_OPTIONS = [
  { label: '市值', value: 'totalMv' },
  { label: 'PE(TTM)', value: 'peTtm' },
  { label: 'PB', value: 'pb' },
  { label: 'ROE', value: 'roe' },
  { label: '营收增速', value: 'revenueGrowth' },
  { label: '净利润增速', value: 'netProfitGrowth' },
  { label: '换手率', value: 'turnoverRate' },
  { label: '涨跌幅', value: 'pctChg' },
];

export const WEIGHT_MODE_OPTIONS = [
  { label: '等权', value: 'equal' },
  { label: '排名加权', value: 'rank' },
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
  rebalanceFrequency: 'monthly',
  priceMode: 'next_open',
  enableTradeConstraints: false,
  commissionRate: 0.0003,
  stampDutyRate: 0.001,
  minCommission: 5,
  slippageBps: 5,
  maxPositions: 20,
  maxWeightPerStock: 0.1,
  minDaysListed: 60,
  strategyConfig: {},
};

export const DEFAULT_MA_CONFIG = {
  tsCode: '',
  shortPeriod: 5,
  longPeriod: 20,
  allowShort: false,
};

export const DEFAULT_SCREENING_CONFIG = {
  rankBy: 'totalMv',
  rankOrder: 'desc' as const,
  topN: 20,
  weightMode: 'equal' as const,
};

export const DEFAULT_FACTOR_CONFIG = {
  factorName: '',
  rankOrder: 'desc' as const,
  topN: 20,
};

export const DEFAULT_CUSTOM_POOL_CONFIG = {
  tsCodes: [] as string[],
  weightMode: 'equal' as const,
  weights: {} as Record<string, number>,
};
