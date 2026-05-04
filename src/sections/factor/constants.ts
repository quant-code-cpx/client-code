import type {
  FactorStatus,
  FactorCategory,
  AdminJobStatus,
  FactorSourceType,
} from 'src/api/factor';

// ----------------------------------------------------------------------

/** 因子分类标签（含「全部」） */
export const CATEGORY_LABELS: Record<FactorCategory | 'ALL', string> = {
  ALL: '全部',
  VALUATION: '估值',
  SIZE: '规模',
  MOMENTUM: '动量',
  VOLATILITY: '波动率',
  LIQUIDITY: '流动性',
  QUALITY: '质量',
  GROWTH: '成长',
  CAPITAL_FLOW: '资金流',
  LEVERAGE: '杠杆',
  DIVIDEND: '红利',
  TECHNICAL: '技术',
  CUSTOM: '自定义',
};

/** 分类有序数组 */
export const FACTOR_CATEGORIES: FactorCategory[] = [
  'VALUATION',
  'SIZE',
  'MOMENTUM',
  'VOLATILITY',
  'LIQUIDITY',
  'QUALITY',
  'GROWTH',
  'CAPITAL_FLOW',
  'LEVERAGE',
  'DIVIDEND',
  'TECHNICAL',
  'CUSTOM',
];

/** 因子来源标签 */
export const SOURCE_LABELS: Record<FactorSourceType, string> = {
  FIELD_REF: '内置',
  DERIVED: '衍生',
  CUSTOM_SQL: '自定义',
};

/** 因子状态徽标文案与色彩（库页右上角圆点） */
export const STATUS_META: Record<
  FactorStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' }
> = {
  FRESH: { label: '数据新鲜', color: 'success' },
  STALE: { label: '数据滞后', color: 'warning' },
  FAILED: { label: '最近预计算失败', color: 'error' },
  NEVER: { label: '尚未预计算', color: 'default' },
  DISABLED: { label: '已禁用', color: 'default' },
};

/** 当后端未提供 status 字段时，根据 isEnabled / summary 推导本地状态 */
export function deriveStatus(opts: {
  isEnabled?: boolean;
  lastComputeDate?: string | null;
  latencyDays?: number | null;
  staleThresholdDays?: number;
}): FactorStatus {
  const { isEnabled, lastComputeDate, latencyDays, staleThresholdDays = 5 } = opts;
  if (isEnabled === false) return 'DISABLED';
  if (!lastComputeDate) return 'NEVER';
  if ((latencyDays ?? 0) > staleThresholdDays) return 'STALE';
  return 'FRESH';
}

// ─── Admin 管理页专用状态映射 ─────────────────────────────────

/** 预计算状态表 status 字段（后端原始枚举） → 中文 + 色 */
export const ADMIN_COMPUTE_STATUS_META: Record<
  string,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }
> = {
  UP_TO_DATE: { label: '最新', color: 'success' },
  STALE: { label: '滞后', color: 'warning' },
  FAILED: { label: '失败', color: 'error' },
  NEVER: { label: '未计算', color: 'default' },
  RUNNING: { label: '进行中', color: 'info' },
};

/** 任务状态（BE-1 / BE-2） → 中文 + 色 */
export const ADMIN_JOB_STATUS_META: Record<
  AdminJobStatus,
  { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }
> = {
  PENDING: { label: '排队中', color: 'default' },
  RUNNING: { label: '进行中', color: 'info' },
  SUCCESS: { label: '成功', color: 'success' },
  FAILED: { label: '失败', color: 'error' },
  PARTIAL: { label: '部分失败', color: 'warning' },
  CANCELLED: { label: '已取消', color: 'default' },
};

/** 任务类型 → 中文 */
export const ADMIN_JOB_TYPE_LABELS: Record<string, string> = {
  PRECOMPUTE: '预计算',
  BACKFILL: '历史回补',
};

/** 审计操作类型 → 中文 */
export const ADMIN_AUDIT_ACTION_LABELS: Record<string, string> = {
  PRECOMPUTE: '触发预计算',
  BACKFILL: '触发回补',
  TOGGLE_ENABLE: '启用因子',
  TOGGLE_DISABLE: '禁用因子',
  JOB_CANCEL: '取消任务',
  JOB_RETRY: '重试任务',
};

/** 滞后天数阈值着色 */
export function staleDaysColor(
  days: number | null | undefined
): 'success' | 'warning' | 'error' | 'default' {
  if (days == null) return 'default';
  if (days === 0) return 'success';
  if (days <= 2) return 'warning';
  return 'error';
}

/** 覆盖度阈值着色 */
export function coverageColor(
  rate: number | null | undefined
): 'success' | 'warning' | 'error' | 'default' {
  if (rate == null) return 'default';
  if (rate >= 0.8) return 'success';
  if (rate >= 0.6) return 'warning';
  return 'error';
}
