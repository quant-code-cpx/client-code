import type { BuySignal, ScreenerFilters } from 'src/api/screener';

import type { HeadCell } from './types';

// ----------------------------------------------------------------------
// 默认筛选条件（空 = 无限制）
// ----------------------------------------------------------------------

export const DEFAULT_FILTERS: ScreenerFilters = {};

export const SCREENER_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

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
  { value: 'psTtm', label: 'PS TTM' },
  { value: 'dvTtm', label: '股息率' },
  { value: 'pctChg', label: '涨跌幅' },
  { value: 'close', label: '最新价' },
  { value: 'turnoverRate', label: '换手率' },
  { value: 'roe', label: 'ROE' },
  { value: 'revenueYoy', label: '营收增速' },
  { value: 'netprofitYoy', label: '净利增速' },
  { value: 'mainNetInflow5d', label: '5日主力净流入' },
  { value: 'buySignalCount', label: '偏多信号数' },
  { value: 'grossMargin', label: '毛利率' },
  { value: 'netMargin', label: '净利率' },
  { value: 'debtToAssets', label: '资产负债率' },
] as const;

// ----------------------------------------------------------------------
// 结果表格列配置
// ----------------------------------------------------------------------

export const SCREENER_HEAD_CELLS: HeadCell[] = [
  {
    id: 'name',
    label: '股票名称/代码',
    sortable: false,
    minWidth: 180,
    sticky: true,
    defaultVisible: true,
  },
  {
    id: 'close',
    label: '最新价',
    sortable: false,
    align: 'right',
    minWidth: 90,
    defaultVisible: true,
  },
  {
    id: 'pctChg',
    label: '涨跌幅',
    sortable: true,
    align: 'right',
    minWidth: 90,
    defaultVisible: true,
  },
  {
    id: 'totalMv',
    label: '总市值',
    sortable: true,
    align: 'right',
    minWidth: 100,
    defaultVisible: true,
  },
  {
    id: 'peTtm',
    label: 'PE TTM',
    sortable: true,
    align: 'right',
    minWidth: 80,
    defaultVisible: true,
  },
  { id: 'pb', label: 'PB', sortable: true, align: 'right', minWidth: 80, defaultVisible: true },
  {
    id: 'dvTtm',
    label: '股息率',
    sortable: true,
    align: 'right',
    minWidth: 80,
    defaultVisible: true,
  },
  {
    id: 'turnoverRate',
    label: '换手率',
    sortable: true,
    align: 'right',
    minWidth: 80,
    defaultVisible: true,
  },
  { id: 'roe', label: 'ROE', sortable: true, align: 'right', minWidth: 80, defaultVisible: false },
  {
    id: 'revenueYoy',
    label: '营收增速',
    sortable: true,
    align: 'right',
    minWidth: 90,
    defaultVisible: false,
  },
  {
    id: 'netprofitYoy',
    label: '净利增速',
    sortable: true,
    align: 'right',
    minWidth: 90,
    defaultVisible: false,
  },
  {
    id: 'grossMargin',
    label: '毛利率',
    sortable: true,
    align: 'right',
    minWidth: 80,
    defaultVisible: false,
  },
  {
    id: 'netMargin',
    label: '净利率',
    sortable: true,
    align: 'right',
    minWidth: 80,
    defaultVisible: false,
  },
  {
    id: 'debtToAssets',
    label: '资产负债率',
    sortable: true,
    align: 'right',
    minWidth: 90,
    defaultVisible: false,
  },
  {
    id: 'currentRatio',
    label: '流动比率',
    sortable: false,
    align: 'right',
    minWidth: 80,
    defaultVisible: false,
  },
  {
    id: 'quickRatio',
    label: '速动比率',
    sortable: false,
    align: 'right',
    minWidth: 80,
    defaultVisible: false,
  },
  {
    id: 'ocfToNetprofit',
    label: 'OCF/净利',
    sortable: false,
    align: 'right',
    minWidth: 90,
    defaultVisible: false,
  },
  {
    id: 'mainNetInflow5d',
    label: '5日主力净流入',
    sortable: true,
    align: 'right',
    minWidth: 120,
    defaultVisible: false,
  },
  {
    id: 'mainNetInflow20d',
    label: '20日主力净流入',
    sortable: false,
    align: 'right',
    minWidth: 120,
    defaultVisible: false,
  },
  {
    id: 'buySignalCount',
    label: '偏多信号',
    sortable: true,
    align: 'left',
    minWidth: 180,
    defaultVisible: false,
  },
  {
    id: 'psTtm',
    label: 'PS TTM',
    sortable: true,
    align: 'right',
    minWidth: 80,
    defaultVisible: false,
  },
  {
    id: 'concepts',
    label: '概念板块',
    sortable: false,
    align: 'left',
    minWidth: 140,
    defaultVisible: false,
  },
  {
    id: 'industry',
    label: '行业',
    sortable: false,
    align: 'left',
    minWidth: 90,
    defaultVisible: true,
  },
  {
    id: 'market',
    label: '板块',
    sortable: false,
    align: 'left',
    minWidth: 80,
    defaultVisible: true,
  },
  {
    id: 'latestFinDate',
    label: '财报期',
    sortable: false,
    align: 'center',
    minWidth: 100,
    defaultVisible: false,
  },
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
  minPsTtm: ['psTtm'],
  maxPsTtm: ['psTtm'],
  conceptCodes: ['concepts'],
  northboundOnly: ['mainNetInflow5d'],
  minBuySignalCount: ['buySignalCount'],
};

// 排序字段 → 触发显示的列 ID 映射
export const SORT_TO_COLUMN_MAP: Record<string, string> = {
  roe: 'roe',
  revenueYoy: 'revenueYoy',
  netprofitYoy: 'netprofitYoy',
  mainNetInflow5d: 'mainNetInflow5d',
  psTtm: 'psTtm',
  close: 'close',
  buySignalCount: 'buySignalCount',
};

export const BUY_SIGNAL_LABELS: Record<BuySignal, string> = {
  MACD_GOLDEN_CROSS: 'MACD 金叉',
  KDJ_GOLDEN_CROSS: 'KDJ 金叉',
  MA_BULLISH: '均线多头',
  BOLL_OVERSOLD: 'BOLL 超卖',
  RSI_OVERSOLD: 'RSI 超卖',
};

// ----------------------------------------------------------------------
// 技术信号选项
// ----------------------------------------------------------------------

export const MACD_SIGNAL_OPTIONS = [
  { value: '', label: '不限' },
  { value: 'golden_cross', label: 'MACD 金叉' },
  { value: 'death_cross', label: 'MACD 死叉' },
] as const;

export const KDJ_SIGNAL_OPTIONS = [
  { value: '', label: '不限' },
  { value: 'golden_cross', label: 'KDJ 金叉' },
  { value: 'death_cross', label: 'KDJ 死叉' },
] as const;

export const RSI_SIGNAL_OPTIONS = [
  { value: '', label: '不限' },
  { value: 'overbought', label: '超买 (RSI>70)' },
  { value: 'oversold', label: '超卖 (RSI<30)' },
] as const;

export const BOLL_SIGNAL_OPTIONS = [
  { value: '', label: '不限' },
  { value: 'above_upper', label: '突破上轨' },
  { value: 'below_lower', label: '跌破下轨' },
  { value: 'squeeze', label: '布林带缩口' },
] as const;

export const MA_TREND_OPTIONS = [
  { value: '', label: '不限' },
  { value: 'bullish', label: '多头排列' },
  { value: 'bearish', label: '空头排列' },
] as const;
