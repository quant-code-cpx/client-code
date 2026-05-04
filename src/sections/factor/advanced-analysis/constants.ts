// 因子高级分析 - 常量与文案

// ----------------------------------------------------------------------
// Universe 选项（复用首页指数目录，详见 design 1.5 Q3）
// ----------------------------------------------------------------------

export type UniverseOption = {
  label: string;
  value: string;
  group: string;
};

export const UNIVERSE_OPTIONS: UniverseOption[] = [
  { label: '全市场', value: '', group: '默认' },
  { label: '沪深300', value: '000300.SH', group: '沪深宽基' },
  { label: '上证50', value: '000016.SH', group: '沪深宽基' },
  { label: '中证500', value: '000905.SH', group: '沪深宽基' },
  { label: '中证1000', value: '000852.SH', group: '沪深宽基' },
  { label: '上证指数', value: '000001.SH', group: '上交所' },
  { label: '上证180', value: '000010.SH', group: '上交所' },
  { label: '科创50', value: '000688.SH', group: '上交所' },
  { label: '科创100', value: '000698.SH', group: '上交所' },
  { label: '深证成指', value: '399001.SZ', group: '深交所' },
  { label: '创业板指', value: '399006.SZ', group: '深交所' },
  { label: '创业板50', value: '399673.SZ', group: '深交所' },
  { label: '中小100', value: '399005.SZ', group: '深交所' },
  { label: '北证50', value: '899050.BJ', group: '北交所' },
];

export const UNIVERSE_LABEL_MAP = Object.fromEntries(
  UNIVERSE_OPTIONS.map((o) => [o.value, o.label])
) as Record<string, string>;

// ----------------------------------------------------------------------
// FMB forwardDays 预设
// ----------------------------------------------------------------------

export const FORWARD_DAYS_PRESETS = [5, 10, 20, 60];

// ----------------------------------------------------------------------
// 时间窗预设（FMB / 共享上下文）
// ----------------------------------------------------------------------

export type TimeRangePreset = '1M' | '3M' | '6M' | '1Y' | 'CUSTOM';

export const TIME_RANGE_PRESETS: { label: string; value: TimeRangePreset }[] = [
  { label: '近 1 月', value: '1M' },
  { label: '近 3 月', value: '3M' },
  { label: '近 6 月', value: '6M' },
  { label: '近 1 年', value: '1Y' },
  { label: '自定义', value: 'CUSTOM' },
];

// ----------------------------------------------------------------------
// 优化方法选项
// ----------------------------------------------------------------------

export const OPTIMIZATION_MODES: {
  value: 'MVO' | 'MIN_VARIANCE' | 'RISK_PARITY' | 'MAX_DIVERSIFICATION';
  label: string;
}[] = [
  { value: 'MVO', label: '均值-方差优化' },
  { value: 'MIN_VARIANCE', label: '最小方差' },
  { value: 'RISK_PARITY', label: '风险平价' },
  { value: 'MAX_DIVERSIFICATION', label: '最大分散化' },
];

// ----------------------------------------------------------------------
// 协方差估计方式（BE-4 未上线时整组禁用）
// ----------------------------------------------------------------------

export const COV_METHOD_OPTIONS: { value: 'sample' | 'ledoit_wolf' | 'ewma'; label: string }[] = [
  { value: 'sample', label: '样本协方差' },
  { value: 'ledoit_wolf', label: 'Ledoit-Wolf 收缩' },
  { value: 'ewma', label: 'EWMA（半衰 60）' },
];

// ----------------------------------------------------------------------
// localStorage key
// ----------------------------------------------------------------------

export const HISTORY_STORAGE_KEY = 'factor-advanced-analysis.history.v1';
export const CONTEXT_STORAGE_KEY = 'factor-advanced-analysis.context.v1';
export const HISTORY_MAX = 10;

// ----------------------------------------------------------------------
// 后端能力升级中（disabled tooltip 文案）
// ----------------------------------------------------------------------

export const BE_PENDING_TOOLTIP = '⚠ 后端能力升级中，待对应字段上线后启用';
