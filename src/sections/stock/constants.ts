import type { HeadCell } from './types';

// ----------------------------------------------------------------------
// 交易所
// ----------------------------------------------------------------------

export const EXCHANGE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'SSE', label: '上交所' },
  { value: 'SZSE', label: '深交所' },
  { value: 'BSE', label: '北交所' },
] as const;

/** 交易所代码 → 中文名 */
export const EXCHANGE_LABEL: Record<string, string> = {
  SSE: '上交所',
  SZSE: '深交所',
  BSE: '北交所',
};

// ----------------------------------------------------------------------
// 板块
// ----------------------------------------------------------------------

export const MARKET_OPTIONS = [
  { value: '', label: '全部' },
  { value: '主板', label: '主板' },
  { value: '创业板', label: '创业板' },
  { value: '科创板', label: '科创板' },
  { value: '北交所', label: '北交所' },
] as const;

// ----------------------------------------------------------------------
// 沪深港通（isHs）
// ----------------------------------------------------------------------

export const IS_HS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'N', label: '非港通' },
  { value: 'H', label: '沪港通' },
  { value: 'S', label: '深港通' },
] as const;

/** isHs 代码 → 中文名 */
export const IS_HS_LABEL: Record<string, string> = {
  N: '非港通',
  H: '沪港通',
  S: '深港通',
};

// ----------------------------------------------------------------------
// 排序字段（对应后端 StockSortBy 枚举值）
// ----------------------------------------------------------------------

export const SORT_BY = {
  TOTAL_MV: 'totalMv',
  PCT_CHG: 'pctChg',
  TURNOVER_RATE: 'turnoverRate',
  AMOUNT: 'amount',
  PE_TTM: 'peTtm',
  PB: 'pb',
  DV_TTM: 'dvTtm',
  LIST_DATE: 'listDate',
} as const;

// ----------------------------------------------------------------------
// 快捷条件阈值（业务约定）
// ----------------------------------------------------------------------

/** 高流动性：成交额 > 1 亿（千元单位 → 100,000） */
export const QUICK_HIGH_LIQUIDITY_MIN_AMOUNT = 100_000;
/** 高股息：股息率(TTM) ≥ 3% */
export const QUICK_HIGH_DIVIDEND_MIN_DV = 0.03;
/** 大市值：总市值 ≥ 100 亿（万元单位 → 1,000,000） */
export const QUICK_LARGE_CAP_MIN_TOTAL_MV = 1_000_000;

// ----------------------------------------------------------------------
// 列配置
// ----------------------------------------------------------------------

/** 全部可配置的列 ID（不含固定首列 `name`） */
export const ALL_COLUMN_IDS = [
  'close',
  'pctChg',
  'exchange',
  'market',
  'industry',
  'totalMv',
  'circMv',
  'turnoverRate',
  'amount',
  'peTtm',
  'pb',
  'dvTtm',
] as const;

/** 默认显示的列 */
export const DEFAULT_VISIBLE_COLUMNS: ReadonlyArray<(typeof ALL_COLUMN_IDS)[number]> = [
  'close',
  'pctChg',
  'exchange',
  'market',
  'industry',
  'totalMv',
  'circMv',
  'turnoverRate',
  'amount',
  'peTtm',
  'pb',
  'dvTtm',
];

/** 列配置 localStorage 键 */
export const COLUMN_PREFS_STORAGE_KEY = 'stock-list:columns:v1';

// ----------------------------------------------------------------------
// 列表表头（列顺序：名称/代码 → 最新价 → 涨跌幅 → 交易所 → 板块 → 行业
//          → 总市值 → 流通市值 → 换手率 → 成交额 → 市盈率 → 市净率 → 股息率）
// ----------------------------------------------------------------------

export const HEAD_LABELS: HeadCell[] = [
  { id: 'name', label: '股票名称/代码', sortable: false, minWidth: 180, sticky: true },
  { id: 'close', label: '最新价', sortable: false, align: 'right', minWidth: 90 },
  { id: 'pctChg', label: '涨跌幅', sortable: true, align: 'right', minWidth: 90 },
  { id: 'exchange', label: '交易所', sortable: false, minWidth: 90 },
  { id: 'market', label: '板块', sortable: false, minWidth: 90 },
  { id: 'industry', label: '行业', sortable: false, minWidth: 90 },
  { id: 'totalMv', label: '总市值', sortable: true, align: 'right', minWidth: 100 },
  { id: 'circMv', label: '流通市值', sortable: false, align: 'right', minWidth: 100 },
  { id: 'turnoverRate', label: '换手率', sortable: true, align: 'right', minWidth: 90 },
  { id: 'amount', label: '成交额', sortable: true, align: 'right', minWidth: 100 },
  { id: 'peTtm', label: '市盈率(TTM)', sortable: true, align: 'right', minWidth: 110 },
  { id: 'pb', label: '市净率', sortable: true, align: 'right', minWidth: 90 },
  { id: 'dvTtm', label: '股息率(TTM)', sortable: true, align: 'right', minWidth: 110 },
];

/** 列 ID → 中文展示名（用于列配置 Popover） */
export const COLUMN_LABEL: Record<(typeof ALL_COLUMN_IDS)[number], string> = {
  close: '最新价',
  pctChg: '涨跌幅',
  exchange: '交易所',
  market: '板块',
  industry: '行业',
  totalMv: '总市值',
  circMv: '流通市值',
  turnoverRate: '换手率',
  amount: '成交额',
  peTtm: '市盈率(TTM)',
  pb: '市净率',
  dvTtm: '股息率(TTM)',
};
