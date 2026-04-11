export const RULE_TYPE_LABEL: Record<string, string> = {
  MAX_SINGLE_POSITION: '单只持仓上限',
  MAX_INDUSTRY_WEIGHT: '行业权重上限',
  MAX_DRAWDOWN_STOP: '最大回撤止损',
};

export const RULE_TYPE_OPTIONS = [
  { label: '单只持仓上限', value: 'MAX_SINGLE_POSITION' },
  { label: '行业权重上限', value: 'MAX_INDUSTRY_WEIGHT' },
  { label: '最大回撤止损', value: 'MAX_DRAWDOWN_STOP' },
];

export const RULE_TYPE_COLOR: Record<string, 'primary' | 'warning' | 'error'> = {
  MAX_SINGLE_POSITION: 'primary',
  MAX_INDUSTRY_WEIGHT: 'warning',
  MAX_DRAWDOWN_STOP: 'error',
};

export const HHI_LEVEL = {
  LOW: { max: 0.1, label: '低集中度（分散）', color: 'success' as const },
  MEDIUM: { max: 0.25, label: '中等集中度', color: 'warning' as const },
  HIGH: { max: Infinity, label: '高集中度（集中）', color: 'error' as const },
};

export function getHhiLevel(hhi: number) {
  if (hhi < HHI_LEVEL.LOW.max) return HHI_LEVEL.LOW;
  if (hhi < HHI_LEVEL.MEDIUM.max) return HHI_LEVEL.MEDIUM;
  return HHI_LEVEL.HIGH;
}

export const DETAIL_TABS = [
  { value: 'holdings', label: '持仓管理', icon: 'solar:wallet-bold' },
  { value: 'pnl', label: '盈亏分析', icon: 'solar:graph-up-bold' },
  { value: 'risk', label: '风险分析', icon: 'solar:shield-warning-bold' },
  { value: 'rules', label: '风控规则', icon: 'solar:lock-bold' },
];
