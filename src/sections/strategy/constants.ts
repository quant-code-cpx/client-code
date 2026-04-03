// ----------------------------------------------------------------------
// Strategy type labels, options, colors, icons for the strategy module
// Extends the backtest module's constants to include FACTOR_SCREENING_ROTATION
// ----------------------------------------------------------------------

export const STRATEGY_TYPE_LABEL: Record<string, string> = {
  MA_CROSS_SINGLE: '均线择时',
  SCREENING_ROTATION: '选股轮动',
  FACTOR_RANKING: '因子排序',
  CUSTOM_POOL_REBALANCE: '自定义股票池',
  FACTOR_SCREENING_ROTATION: '因子选股轮动',
};

export const STRATEGY_TYPE_OPTIONS = [
  { label: '全部', value: '' },
  { label: '均线择时', value: 'MA_CROSS_SINGLE' },
  { label: '选股轮动', value: 'SCREENING_ROTATION' },
  { label: '因子排序', value: 'FACTOR_RANKING' },
  { label: '自定义股票池', value: 'CUSTOM_POOL_REBALANCE' },
  { label: '因子选股轮动', value: 'FACTOR_SCREENING_ROTATION' },
];

export const STRATEGY_TYPE_COLOR: Record<
  string,
  'primary' | 'info' | 'warning' | 'success' | 'error'
> = {
  MA_CROSS_SINGLE: 'primary',
  SCREENING_ROTATION: 'info',
  FACTOR_RANKING: 'warning',
  CUSTOM_POOL_REBALANCE: 'success',
  FACTOR_SCREENING_ROTATION: 'error',
};

export const STRATEGY_TYPE_ICON: Record<string, string> = {
  MA_CROSS_SINGLE: 'solar:chart-bold',
  SCREENING_ROTATION: 'solar:sort-by-alphabet-bold',
  FACTOR_RANKING: 'solar:ranking-bold',
  CUSTOM_POOL_REBALANCE: 'solar:inbox-bold',
  FACTOR_SCREENING_ROTATION: 'solar:filter-bold',
};

export const STRATEGY_TYPE_DESCRIPTION: Record<string, string> = {
  MA_CROSS_SINGLE: '基于单均线或双均线交叉信号的择时策略',
  SCREENING_ROTATION: '按指标排名筛选并持有 Top N 股票的轮动策略',
  FACTOR_RANKING: '基于单一因子排名构建多层次组合的策略',
  CUSTOM_POOL_REBALANCE: '对自定义股票池进行周期性再平衡的策略',
  FACTOR_SCREENING_ROTATION: '先用因子筛选股票再按指标排名轮动的复合策略',
};
