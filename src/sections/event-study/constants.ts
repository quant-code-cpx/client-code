import type { EventType, SignalType } from 'src/api/event-study';

// ----------------------------------------------------------------------

/** 事件类型中文标签（兜底用，API 也会返回 label） */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FORECAST: '业绩预告',
  DIVIDEND_EX: '分红除权',
  HOLDER_INCREASE: '股东增持',
  HOLDER_DECREASE: '股东减持',
  SHARE_FLOAT: '限售解禁',
  REPURCHASE: '股票回购',
  AUDIT_QUALIFIED: '非标审计',
  DISCLOSURE: '财报披露',
};

/** 信号类型配置 */
export const SIGNAL_TYPE_CONFIG: Record<SignalType, { label: string; color: string }> = {
  BUY: { label: '买入', color: 'success' },
  SELL: { label: '卖出', color: 'error' },
  WATCH: { label: '观察', color: 'info' },
};

/** 事件查询表格 — 按事件类型的动态列配置 */
export const EVENT_TABLE_COLUMNS: Record<
  EventType,
  { field: string; headerName: string; width?: number }[]
> = {
  FORECAST: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'ann_date', headerName: '公告日期', width: 120 },
    { field: 'end_date', headerName: '报告期', width: 120 },
    { field: 'type', headerName: '预告类型', width: 100 },
    { field: 'p_change_min', headerName: '预计变动幅度下限(%)', width: 180 },
    { field: 'p_change_max', headerName: '预计变动幅度上限(%)', width: 180 },
    { field: 'summary', headerName: '摘要', width: 300 },
  ],
  DIVIDEND_EX: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'ex_date', headerName: '除权除息日', width: 120 },
    { field: 'stk_div', headerName: '每股送转', width: 100 },
    { field: 'cash_div', headerName: '每股派息(元)', width: 120 },
  ],
  HOLDER_INCREASE: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'ann_date', headerName: '公告日期', width: 120 },
    { field: 'holder_name', headerName: '股东名称', width: 160 },
    { field: 'change_vol', headerName: '变动数量(万股)', width: 140 },
    { field: 'change_ratio', headerName: '变动比例(%)', width: 120 },
  ],
  HOLDER_DECREASE: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'ann_date', headerName: '公告日期', width: 120 },
    { field: 'holder_name', headerName: '股东名称', width: 160 },
    { field: 'change_vol', headerName: '变动数量(万股)', width: 140 },
    { field: 'change_ratio', headerName: '变动比例(%)', width: 120 },
  ],
  SHARE_FLOAT: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'float_date', headerName: '解禁日期', width: 120 },
    { field: 'float_share', headerName: '解禁数量(万股)', width: 140 },
    { field: 'float_ratio', headerName: '解禁比例(%)', width: 120 },
  ],
  REPURCHASE: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'ann_date', headerName: '公告日期', width: 120 },
    { field: 'exp_date', headerName: '到期日期', width: 120 },
    { field: 'vol', headerName: '回购数量(万股)', width: 140 },
    { field: 'amount', headerName: '回购金额(万元)', width: 140 },
  ],
  AUDIT_QUALIFIED: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'ann_date', headerName: '公告日期', width: 120 },
    { field: 'end_date', headerName: '报告期', width: 120 },
    { field: 'audit_result', headerName: '审计结果', width: 160 },
    { field: 'audit_agency', headerName: '审计机构', width: 200 },
  ],
  DISCLOSURE: [
    { field: 'ts_code', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'ann_date', headerName: '公告日期', width: 120 },
    { field: 'end_date', headerName: '报告期', width: 120 },
    { field: 'report_type', headerName: '报告类型', width: 120 },
  ],
};

/** 条件运算符 */
export const CONDITION_OPERATORS = [
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'in', label: '包含' },
];

/** 基准指数选项 */
export const BENCHMARK_OPTIONS = [
  { value: '000300.SH', label: '沪深300' },
  { value: '000001.SH', label: '上证指数' },
  { value: '399001.SZ', label: '深证成指' },
  { value: '399006.SZ', label: '创业板指' },
];
