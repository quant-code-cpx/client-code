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
// 列表表头（列顺序：名称/代码 → 最新价 → 涨跌幅 → 交易所 → 板块 → 行业
//          → 总市值 → 流通市值 → 换手率 → 成交额 → 市盈率 → 市净率 → 股息率）
// ----------------------------------------------------------------------

export const HEAD_LABELS: HeadCell[] = [
  { id: 'name', label: '股票名称/代码', sortable: false, minWidth: 180 },
  { id: 'close', label: '最新价', sortable: false, align: 'right' },
  { id: 'pctChg', label: '涨跌幅', sortable: true, align: 'right' },
  { id: 'exchange', label: '交易所', sortable: false },
  { id: 'market', label: '板块', sortable: false },
  { id: 'industry', label: '行业', sortable: false },
  { id: 'totalMv', label: '总市值', sortable: true, align: 'right' },
  { id: 'circMv', label: '流通市值', sortable: false, align: 'right' },
  { id: 'turnoverRate', label: '换手率', sortable: true, align: 'right' },
  { id: 'amount', label: '成交额', sortable: true, align: 'right' },
  { id: 'peTtm', label: '市盈率(TTM)', sortable: true, align: 'right', minWidth: 110 },
  { id: 'pb', label: '市净率', sortable: true, align: 'right' },
  { id: 'dvTtm', label: '股息率(TTM)', sortable: true, align: 'right', minWidth: 110 },
];
