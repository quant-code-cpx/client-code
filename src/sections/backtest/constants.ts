import dayjs from 'dayjs';

import type { BacktestRunForm, StrategyTemplateId } from './types';

// ----------------------------------------------------------------------

export const DATE_FORMAT = 'YYYY-MM-DD';
export const API_DATE_FORMAT = 'YYYYMMDD';
export const BACKTEST_AUTOSAVE_ID = '__autosave__';
export const BACKTEST_AUTOSAVE_KEY_PREFIX = 'backtest-workbench-autosave:v1';

export const RANGE_PRESETS = [
  { id: '1Y', label: '近 1 年' },
  { id: '3Y', label: '近 3 年' },
  { id: '5Y', label: '近 5 年' },
  { id: 'FROM_2019', label: '2019 至今' },
  { id: 'BULL_2020', label: '2020 牛市' },
  { id: 'FROM_2024', label: '2024 至今' },
] as const;

export type RangePresetId = (typeof RANGE_PRESETS)[number]['id'];

export const BENCHMARK_OPTIONS = [
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
  { label: '上证50', value: '000016.SH' },
  { label: '上证指数', value: '000001.SH' },
  { label: '深证成指', value: '399001.SZ' },
];

export const BENCHMARK_BY_UNIVERSE: Record<string, string> = {
  HS300: '000300.SH',
  CSI500: '000905.SH',
  CSI1000: '000852.SH',
  SSE50: '000016.SH',
  ALL_A: '000300.SH',
  CUSTOM: '000300.SH',
};

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

export const COST_PRESETS = [
  {
    id: 'DEFAULT',
    label: '默认（万 3）',
    commissionRate: 0.0003,
    stampDutyRate: 0.0005,
    minCommission: 5,
  },
  {
    id: 'BROKER_DISCOUNT',
    label: '券商优惠（万 1.5）',
    commissionRate: 0.00015,
    stampDutyRate: 0.0005,
    minCommission: 5,
  },
  {
    id: 'INSTITUTION',
    label: '机构（万 0.5）',
    commissionRate: 0.00005,
    stampDutyRate: 0.0005,
    minCommission: 0,
  },
] as const;

export type CostPresetId = (typeof COST_PRESETS)[number]['id'] | 'CUSTOM';

export const TOOLTIP_TEXTS: Record<string, string> = {
  benchmarkTsCode: '用于衡量策略是否跑赢市场。系统会根据股票池给出推荐基准，你仍可手动切换。',
  rebalanceFrequency: '策略重新计算持仓并调仓的频率。频率越高，交易成本与数据要求通常越高。',
  priceMode: '信号日之后实际成交的价格口径。次日开盘更接近实盘执行，次日收盘更平滑。',
  enableTradeConstraints: '开启后将考虑涨跌停、停牌等交易约束，结果更贴近真实交易。',
  enableT1Restriction: 'A 股股票买入后通常 T+1 才能卖出，开启后避免同日买卖造成过度理想化。',
  partialFillEnabled: '当涨跌停、停牌或成交约束导致无法完全成交时，允许后端按可成交比例部分成交。',
  commissionRate: '券商佣金费率。0.0003 表示万分之三，通常买卖双边收取。',
  stampDutyRate: '印花税通常卖出时收取。A 股常见默认假设为万分之五。',
  slippageBps: '滑点用于模拟下单价格与成交价格偏差。1 bps = 0.01%。',
  maxWeightPerStock: '单只股票在组合中的最高权重，防止持仓过度集中。',
  minDaysListed: '过滤上市时间过短的新股，减少停牌、无历史数据和次新股异常波动影响。',
};

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
  { label: '部分完成', value: 'PARTIAL' },
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
  PARTIAL: 'warning',
  FAILED: 'error',
  CANCELLED: 'warning',
};

export const STATUS_LABEL: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '运行中',
  COMPLETED: '已完成',
  PARTIAL: '部分完成',
  FAILED: '已失败',
  CANCELLED: '已取消',
};

export function toApiDate(value: string) {
  return value.replace(/-/g, '');
}

export function normalizeDisplayDate(value: string | null | undefined) {
  if (!value) return null;
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value;
}

export function buildDefaultForm(referenceDate: string | Date = new Date()): BacktestRunForm {
  const endDate = dayjs(referenceDate).format(DATE_FORMAT);

  return {
    name: '',
    startDate: dayjs(endDate).subtract(3, 'year').format(DATE_FORMAT),
    endDate,
    initialCapital: 1000000,
    benchmarkTsCode: '000300.SH',
    universe: 'HS300',
    customUniverseTsCodes: [],
    rebalanceFrequency: 'MONTHLY',
    priceMode: 'NEXT_OPEN',
    enableTradeConstraints: true,
    enableT1Restriction: true,
    partialFillEnabled: true,
    commissionRate: 0.0003,
    stampDutyRate: 0.0005,
    minCommission: 5,
    slippageBps: 5,
    maxPositions: 20,
    maxWeightPerStock: 0.1,
    minDaysListed: 60,
    strategyConfig: {},
  };
}

export const DEFAULT_FORM: BacktestRunForm = buildDefaultForm();

export function resolveRangePreset(
  presetId: RangePresetId,
  latestDate: string | null | undefined = DEFAULT_FORM.endDate
) {
  const latest = dayjs(normalizeDisplayDate(latestDate) ?? DEFAULT_FORM.endDate);

  if (presetId === 'BULL_2020') {
    return { startDate: '2020-01-01', endDate: '2020-12-31' };
  }

  if (presetId === 'FROM_2019') {
    return { startDate: '2019-01-01', endDate: latest.format(DATE_FORMAT) };
  }

  if (presetId === 'FROM_2024') {
    return { startDate: '2024-01-01', endDate: latest.format(DATE_FORMAT) };
  }

  const yearsByPreset: Record<
    Exclude<RangePresetId, 'FROM_2019' | 'BULL_2020' | 'FROM_2024'>,
    number
  > = {
    '1Y': 1,
    '3Y': 3,
    '5Y': 5,
  };

  return {
    startDate: latest.subtract(yearsByPreset[presetId], 'year').format(DATE_FORMAT),
    endDate: latest.format(DATE_FORMAT),
  };
}

export function getRecommendedBenchmark(universe: string) {
  return BENCHMARK_BY_UNIVERSE[universe] ?? BENCHMARK_BY_UNIVERSE.ALL_A;
}

export function getCostPresetId(
  form: Pick<BacktestRunForm, 'commissionRate' | 'stampDutyRate' | 'minCommission'>
): CostPresetId {
  const matched = COST_PRESETS.find(
    (preset) =>
      preset.commissionRate === form.commissionRate &&
      preset.stampDutyRate === form.stampDutyRate &&
      preset.minCommission === form.minCommission
  );

  return matched?.id ?? 'CUSTOM';
}

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

export const DEFAULT_STRATEGY_CONFIGS: Record<StrategyTemplateId, Record<string, unknown>> = {
  MA_CROSS_SINGLE: DEFAULT_MA_CONFIG,
  SCREENING_ROTATION: DEFAULT_SCREENING_CONFIG,
  FACTOR_RANKING: DEFAULT_FACTOR_CONFIG,
  CUSTOM_POOL_REBALANCE: DEFAULT_CUSTOM_POOL_CONFIG,
  FACTOR_SCREENING_ROTATION: DEFAULT_SCREENING_CONFIG,
};

export function buildDefaultStrategyConfig(
  templateId: string,
  backendDefault?: Record<string, unknown>
) {
  return {
    ...(DEFAULT_STRATEGY_CONFIGS[templateId as StrategyTemplateId] ?? {}),
    ...(backendDefault ?? {}),
  };
}

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
  mode: 'WF' as const,
  windowMode: 'ROLLING' as const,
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
  purgeDays: 0,
  embargoDays: 0,
  minOosTrades: 0,
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
