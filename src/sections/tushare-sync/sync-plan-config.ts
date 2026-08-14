type CategoryColor = 'primary' | 'info' | 'warning' | 'success' | 'secondary' | 'default';

export const SYNC_PLAN_CATEGORY_LABELS: Record<string, string> = {
  basic: '基础数据',
  market: '行情数据',
  financial: '财务数据',
  moneyflow: '资金流向',
  factor: '因子数据',
  alternative: '另类数据',
  fund: '基金数据',
  macro: '宏观数据',
  option: '期权数据',
};

export const SYNC_PLAN_CATEGORY_ORDER = [
  'basic',
  'market',
  'financial',
  'moneyflow',
  'factor',
  'alternative',
  'fund',
  'macro',
  'option',
] as const;

export const SYNC_PLAN_CATEGORY_COLORS: Record<string, CategoryColor> = {
  basic: 'primary',
  market: 'info',
  financial: 'warning',
  moneyflow: 'success',
  factor: 'secondary',
  alternative: 'default',
  fund: 'info',
  macro: 'warning',
  option: 'default',
};
