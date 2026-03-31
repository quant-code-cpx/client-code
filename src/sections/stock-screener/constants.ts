import type { ScreenerFilters } from 'src/api/screener';

import type { HeadCell } from './types';

// ----------------------------------------------------------------------
// 默认筛选条件（空 = 无限制）
// ----------------------------------------------------------------------

export const DEFAULT_FILTERS: ScreenerFilters = {};

// ----------------------------------------------------------------------
// 交易所选项
// ----------------------------------------------------------------------

export const EXCHANGE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'SSE', label: '上交所' },
  { value: 'SZSE', label: '深交所' },
  { value: 'BSE', label: '北交所' },
] as const;

// ----------------------------------------------------------------------
// 板块选项
// ----------------------------------------------------------------------

export const MARKET_OPTIONS = [
  { value: '', label: '全部' },
  { value: '主板', label: '主板' },
  { value: '创业板', label: '创业板' },
  { value: '科创板', label: '科创板' },
  { value: '北交所', label: '北交所' },
] as const;

// ----------------------------------------------------------------------
// 排序选项（下拉）
// ----------------------------------------------------------------------

export const SORT_OPTIONS = [
  { value: 'totalMv', label: '总市值' },
  { value: 'peTtm', label: 'PE TTM' },
  { value: 'pb', label: 'PB' },
  { value: 'dvTtm', label: '股息率' },
  { value: 'pctChg', label: '涨跌幅' },
  { value: 'turnoverRate', label: '换手率' },
  { value: 'roe', label: 'ROE' },
  { value: 'revenueYoy', label: '营收增速' },
  { value: 'netprofitYoy', label: '净利增速' },
  { value: 'mainNetInflow5d', label: '5日主力净流入' },
] as const;

// ----------------------------------------------------------------------
// 结果表格列配置
// ----------------------------------------------------------------------

export const SCREENER_HEAD_CELLS: HeadCell[] = [
  { id: 'name', label: '股票名称/代码', sortable: false, minWidth: 180, sticky: true, defaultVisible: true },
  { id: 'close', label: '最新价', sortable: false, align: 'right', minWidth: 90, defaultVisible: true },
  { id: 'pctChg', label: '涨跌幅', sortable: true, align: 'right', minWidth: 90, defaultVisible: true },
  { id: 'totalMv', label: '总市值', sortable: true, align: 'right', minWidth: 100, defaultVisible: true },
  { id: 'peTtm', label: 'PE TTM', sortable: true, align: 'right', minWidth: 80, defaultVisible: true },
  { id: 'pb', label: 'PB', sortable: true, align: 'right', minWidth: 80, defaultVisible: true },
  { id: 'dvTtm', label: '股息率', sortable: true, align: 'right', minWidth: 80, defaultVisible: true },
  { id: 'turnoverRate', label: '换手率', sortable: true, align: 'right', minWidth: 80, defaultVisible: true },
  { id: 'roe', label: 'ROE', sortable: true, align: 'right', minWidth: 80, defaultVisible: false },
  { id: 'revenueYoy', label: '营收增速', sortable: true, align: 'right', minWidth: 90, defaultVisible: false },
  { id: 'netprofitYoy', label: '净利增速', sortable: true, align: 'right', minWidth: 90, defaultVisible: false },
  { id: 'grossMargin', label: '毛利率', sortable: true, align: 'right', minWidth: 80, defaultVisible: false },
  { id: 'netMargin', label: '净利率', sortable: true, align: 'right', minWidth: 80, defaultVisible: false },
  { id: 'debtToAssets', label: '资产负债率', sortable: true, align: 'right', minWidth: 90, defaultVisible: false },
  { id: 'currentRatio', label: '流动比率', sortable: false, align: 'right', minWidth: 80, defaultVisible: false },
  { id: 'quickRatio', label: '速动比率', sortable: false, align: 'right', minWidth: 80, defaultVisible: false },
  { id: 'ocfToNetprofit', label: 'OCF/净利', sortable: false, align: 'right', minWidth: 90, defaultVisible: false },
  { id: 'mainNetInflow5d', label: '5日主力净流入', sortable: true, align: 'right', minWidth: 120, defaultVisible: false },
  { id: 'mainNetInflow20d', label: '20日主力净流入', sortable: false, align: 'right', minWidth: 120, defaultVisible: false },
  { id: 'industry', label: '行业', sortable: false, align: 'left', minWidth: 90, defaultVisible: true },
  { id: 'market', label: '板块', sortable: false, align: 'left', minWidth: 80, defaultVisible: true },
  { id: 'latestFinDate', label: '财报期', sortable: false, align: 'center', minWidth: 100, defaultVisible: false },
];

// ----------------------------------------------------------------------
// 条件字段 → 触发显示的列 ID 映射
// ----------------------------------------------------------------------

export const FILTER_TO_COLUMN_MAP: Record<string, string[]> = {
  minRoe: ['roe'],
  maxRoe: ['roe'],
  minRevenueYoy: ['revenueYoy'],
  maxRevenueYoy: ['revenueYoy'],
  minNetprofitYoy: ['netprofitYoy'],
  maxNetprofitYoy: ['netprofitYoy'],
  minGrossMargin: ['grossMargin'],
  maxGrossMargin: ['grossMargin'],
  minNetMargin: ['netMargin'],
  maxNetMargin: ['netMargin'],
  maxDebtToAssets: ['debtToAssets'],
  minCurrentRatio: ['currentRatio'],
  minQuickRatio: ['quickRatio'],
  minOcfToNetprofit: ['ocfToNetprofit'],
  minMainNetInflow5d: ['mainNetInflow5d'],
  minMainNetInflow20d: ['mainNetInflow20d'],
};

// 排序字段 → 触发显示的列 ID 映射
export const SORT_TO_COLUMN_MAP: Record<string, string> = {
  roe: 'roe',
  revenueYoy: 'revenueYoy',
  netprofitYoy: 'netprofitYoy',
  mainNetInflow5d: 'mainNetInflow5d',
};
