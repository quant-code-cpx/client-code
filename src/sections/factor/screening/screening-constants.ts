import type {
  FactorCondition,
  FactorConditionOperator,
  FactorScreeningTradeConstraints,
} from 'src/api/factor';

// ----------------------------------------------------------------------

export const PAGE_SIZE = 50;
export const MAX_CONDITIONS = 10;

/** 股票池下拉项（前端 fallback；BE-10 上线后由后端列表覆盖） */
export const UNIVERSE_OPTIONS: { label: string; value: string }[] = [
  { label: '全市场', value: '' },
  { label: '沪深300', value: '000300.SH' },
  { label: '中证500', value: '000905.SH' },
  { label: '中证1000', value: '000852.SH' },
  { label: '中证2000', value: '932000.CSI' },
  { label: '上证50', value: '000016.SH' },
  { label: '创业板指', value: '399006.SZ' },
  { label: '科创50', value: '000688.SH' },
];

export const OPERATOR_OPTIONS: { value: FactorConditionOperator; label: string }[] = [
  { value: 'gt', label: '大于 >' },
  { value: 'gte', label: '大于等于 >=' },
  { value: 'lt', label: '小于 <' },
  { value: 'lte', label: '小于等于 <=' },
  { value: 'between', label: '介于' },
  { value: 'top_pct', label: '前 N%' },
  { value: 'bottom_pct', label: '后 N%' },
];

export const SORT_MODE_OPTIONS: { value: 'single' | 'composite'; label: string }[] = [
  { value: 'single', label: '单因子排序' },
  { value: 'composite', label: '加权综合分（实验）' },
];

export const DEFAULT_TRADE_CONSTRAINTS: Required<FactorScreeningTradeConstraints> = {
  excludeSt: true,
  excludeSuspended: true,
  excludeBse: false,
  minListDays: 60,
};

export const EMPTY_CONDITION: FactorCondition = {
  factorName: '',
  operator: 'gt',
  value: undefined,
};

/** 本地预设最大条数 */
export const MAX_LOCAL_PRESETS = 10;
export const LOCAL_PRESET_KEY = 'factor-screening:local-presets:v1';
