import type { EventType, SignalType, MarketCapBucket } from 'src/api/event-study';

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
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'annDate', headerName: '公告日期', width: 120 },
    { field: 'endDate', headerName: '报告期', width: 120 },
    { field: 'type', headerName: '预告类型', width: 100 },
    { field: 'pChangeMin', headerName: '预计变动幅度下限(%)', width: 180 },
    { field: 'pChangeMax', headerName: '预计变动幅度上限(%)', width: 180 },
    { field: 'summary', headerName: '摘要', width: 300 },
  ],
  DIVIDEND_EX: [
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'exDate', headerName: '除权除息日', width: 120 },
    { field: 'stkDiv', headerName: '每股送转', width: 100 },
    { field: 'cashDiv', headerName: '每股派息(元)', width: 120 },
  ],
  HOLDER_INCREASE: [
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'annDate', headerName: '公告日期', width: 120 },
    { field: 'holderName', headerName: '股东名称', width: 160 },
    { field: 'changeVol', headerName: '变动数量(万股)', width: 140 },
    { field: 'changeRatio', headerName: '变动比例(%)', width: 120 },
  ],
  HOLDER_DECREASE: [
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'annDate', headerName: '公告日期', width: 120 },
    { field: 'holderName', headerName: '股东名称', width: 160 },
    { field: 'changeVol', headerName: '变动数量(万股)', width: 140 },
    { field: 'changeRatio', headerName: '变动比例(%)', width: 120 },
  ],
  SHARE_FLOAT: [
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'floatDate', headerName: '解禁日期', width: 120 },
    { field: 'floatShare', headerName: '解禁数量(万股)', width: 140 },
    { field: 'floatRatio', headerName: '解禁比例(%)', width: 120 },
  ],
  REPURCHASE: [
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'annDate', headerName: '公告日期', width: 120 },
    { field: 'expDate', headerName: '到期日期', width: 120 },
    { field: 'vol', headerName: '回购数量(万股)', width: 140 },
    { field: 'amount', headerName: '回购金额(万元)', width: 140 },
  ],
  AUDIT_QUALIFIED: [
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'annDate', headerName: '公告日期', width: 120 },
    { field: 'endDate', headerName: '报告期', width: 120 },
    { field: 'auditResult', headerName: '审计结果', width: 160 },
    { field: 'auditAgency', headerName: '审计机构', width: 200 },
  ],
  DISCLOSURE: [
    { field: 'tsCode', headerName: '股票代码', width: 120 },
    { field: 'name', headerName: '名称', width: 100 },
    { field: 'annDate', headerName: '公告日期', width: 120 },
    { field: 'endDate', headerName: '报告期', width: 120 },
    { field: 'reportType', headerName: '报告类型', width: 120 },
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

// ── v2 重构新增 ─────────────────────────────────────────────────────

/** 市值档位选项 */
export const MARKET_CAP_BUCKETS: Array<{ value: MarketCapBucket; label: string; hint: string }> = [
  { value: 'small', label: '小盘', hint: '< 50 亿' },
  { value: 'mid', label: '中盘', hint: '50 - 500 亿' },
  { value: 'large', label: '大盘', hint: '> 500 亿' },
];

/** 行业候选清单（与后端 calendar / segment 维度一致；亦可改为后端字典） */
export const INDUSTRY_OPTIONS = [
  '半导体',
  '银行',
  '医药生物',
  '电力设备',
  '食品饮料',
  '机械',
  '电子',
  '通信',
  '计算机',
  '军工',
  '新能源',
  '汽车',
  '建材',
  '钢铁',
  '化工',
];

/** 按字段类型动态过滤可用运算符 */
export const OPERATORS_BY_FIELD_TYPE: Record<
  'number' | 'date' | 'enum' | 'string',
  Array<{ value: string; label: string }>
> = {
  number: [
    { value: 'gte', label: '≥' },
    { value: 'lte', label: '≤' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'eq', label: '=' },
  ],
  date: [
    { value: 'gte', label: '≥' },
    { value: 'lte', label: '≤' },
  ],
  enum: [
    { value: 'in', label: '∈' },
    { value: 'eq', label: '=' },
  ],
  string: [
    { value: 'eq', label: '=' },
    { value: 'contains', label: '包含' },
  ],
};

/** 信号规则向导步骤 */
export const SIGNAL_RULE_WIZARD_STEPS = ['基本信息', '条件构建', '预览', '确认'];

/** 统一术语 / 口径 Tooltip 文案 */
export const TERMS: Record<string, { title: string; desc: string }> = {
  AR: { title: 'AR (异常收益)', desc: '个股日收益 − 基准日收益。' },
  AAR: { title: 'AAR (平均异常收益)', desc: '所有样本同一相对日的 AR 均值。' },
  CAR: { title: 'CAR (累计异常收益)', desc: '单样本事件窗内 AR 累加。' },
  CAAR: {
    title: 'CAAR (累计平均异常收益)',
    desc: '所有样本 CAR 的均值；本页主指标。',
  },
  T_STAT: {
    title: 't 统计量',
    desc: 'CAAR / (σ/√n)；|t| > 1.96 时双侧 p < 0.05。',
  },
  P_VALUE: {
    title: 'p 值',
    desc: '原假设 "CAAR=0" 被拒绝的最小显著性水平。',
  },
  CLUSTER: {
    title: '聚簇窗口',
    desc: '同一标的相邻事件去重的最小间隔天数（学术常用 ±10）。',
  },
  SIGNIFICANT_RATIO: {
    title: '显著样本占比',
    desc: '样本中 |CAR| 超出 ±2σ 的比例。',
  },
};
