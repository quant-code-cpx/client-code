import type { AnomalyType, AnomalySeverity } from 'src/api/alert';
import type { IconifyName } from 'src/components/iconify/register-icons';

// ----------------------------------------------------------------------
// 异动类型 — 颜色 / 文案 / 单位 / 口径说明 单一来源
// ----------------------------------------------------------------------

export type AnomalyTypeColor = 'warning' | 'error' | 'info';

export type AnomalyTypeConfig = {
  type: AnomalyType;
  label: string;
  shortLabel: string;
  color: AnomalyTypeColor;
  icon: IconifyName;
  /** 阈值/检测值口径说明，用于 Tooltip 与详情 Drawer */
  ruleDesc: string;
  /** 检测值显示单位，仅作 Tooltip / 文案用 */
  unitHint: string;
};

const VOLUME_SURGE_CFG: AnomalyTypeConfig = {
  type: 'VOLUME_SURGE',
  label: '放量突破',
  shortLabel: '放量',
  color: 'warning',
  icon: 'solar:graph-up-bold',
  ruleDesc: '当日成交量 / 近 20 日均量 ≥ 3.0 倍（剔除停牌、数据不足 5 日的样本）',
  unitHint: '倍数',
};

const CONSECUTIVE_LIMIT_UP_CFG: AnomalyTypeConfig = {
  type: 'CONSECUTIVE_LIMIT_UP',
  label: '连续涨停',
  shortLabel: '连板',
  color: 'error',
  icon: 'solar:shield-warning-bold',
  ruleDesc: '收盘价 ≥ 涨停价（来自 stk_limit）连续天数 ≥ 2 天',
  unitHint: '天',
};

const LARGE_NET_INFLOW_CFG: AnomalyTypeConfig = {
  type: 'LARGE_NET_INFLOW',
  label: '大额净流入',
  shortLabel: '主力流入',
  color: 'info',
  icon: 'solar:wallet-bold',
  ruleDesc: '(超大单买入 - 超大单卖出) / 当日成交额 ≥ 15%',
  unitHint: '占比',
};

const ANOMALY_TYPE_MAP: Record<AnomalyType, AnomalyTypeConfig> = {
  VOLUME_SURGE: VOLUME_SURGE_CFG,
  CONSECUTIVE_LIMIT_UP: CONSECUTIVE_LIMIT_UP_CFG,
  LARGE_NET_INFLOW: LARGE_NET_INFLOW_CFG,
};

export const ANOMALY_TYPE_LIST: AnomalyTypeConfig[] = [
  VOLUME_SURGE_CFG,
  CONSECUTIVE_LIMIT_UP_CFG,
  LARGE_NET_INFLOW_CFG,
];

export function getAnomalyTypeConfig(type: AnomalyType): AnomalyTypeConfig {
  return ANOMALY_TYPE_MAP[type];
}

// ----------------------------------------------------------------------
// 数值格式化 — 检测值与阈值
// ----------------------------------------------------------------------

const PLACEHOLDER = '--';

export function formatAnomalyValue(type: AnomalyType, value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return PLACEHOLDER;
  switch (type) {
    case 'VOLUME_SURGE':
      return `${value.toFixed(2)}x`;
    case 'CONSECUTIVE_LIMIT_UP':
      return `${Math.round(value)} 天`;
    case 'LARGE_NET_INFLOW':
      return `${(value * 100).toFixed(2)}%`;
    default:
      return String(value);
  }
}

export function formatAnomalyThreshold(
  type: AnomalyType,
  threshold: number | null | undefined
): string {
  if (threshold == null || Number.isNaN(threshold)) return PLACEHOLDER;
  switch (type) {
    case 'VOLUME_SURGE':
      return `${threshold.toFixed(1)}x`;
    case 'CONSECUTIVE_LIMIT_UP':
      return `${Math.round(threshold)} 天`;
    case 'LARGE_NET_INFLOW':
      return `${(threshold * 100).toFixed(1)}%`;
    default:
      return String(threshold);
  }
}

// ----------------------------------------------------------------------
// 强度等级 — 后端未返回 severity 时按阈值倍数 fallback
// ----------------------------------------------------------------------

export type AnomalySeverityMeta = {
  label: string;
  color: 'error' | 'warning' | 'info' | 'default';
};

const SEVERITY_META: Record<AnomalySeverity, AnomalySeverityMeta> = {
  HIGH: { label: '高', color: 'error' },
  MEDIUM: { label: '中', color: 'warning' },
  LOW: { label: '低', color: 'info' },
};

export function getSeverityMeta(severity: AnomalySeverity | null | undefined): AnomalySeverityMeta {
  if (!severity) return { label: '—', color: 'default' };
  return SEVERITY_META[severity];
}

/** 后端未返回 severity 时按 value/threshold 倍数推导（仅前端兜底，不写回数据） */
export function fallbackSeverity(
  type: AnomalyType,
  value: number,
  threshold: number
): AnomalySeverity {
  if (threshold <= 0 || !Number.isFinite(value)) return 'LOW';
  const ratio = value / threshold;
  if (type === 'CONSECUTIVE_LIMIT_UP') {
    if (value >= 4) return 'HIGH';
    if (value >= 3) return 'MEDIUM';
    return 'LOW';
  }
  if (ratio >= 2) return 'HIGH';
  if (ratio >= 1.4) return 'MEDIUM';
  return 'LOW';
}

// ----------------------------------------------------------------------
// 交易日格式化（YYYYMMDD <-> YYYY-MM-DD）
// ----------------------------------------------------------------------

export function fmtTradeDate(yyyymmdd: string | null | undefined): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return PLACEHOLDER;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

export function tradeDateToYYYYMMDD(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const compact = value.replace(/-/g, '');
  return /^\d{8}$/.test(compact) ? compact : undefined;
}
