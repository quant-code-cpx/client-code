import type { LimitListItem, LimitSealPattern, LimitStreakStatus } from 'src/api/alert';

// ----------------------------------------------------------------------
// 口径文案集中（图标 Tooltip / 列说明都从这里取）
// ----------------------------------------------------------------------

export const LIMIT_GLOSSARY = {
  sealAmount: '封单额 = 封单笔数 × 当前价（单位：万元）',
  sealRatio: '封单额 / 流通市值。比例越高代表封板越硬。',
  streakDays: '连板/连跌天数：本日封板与昨日封板连续累积的天数。',
  streakStatus:
    '首板：今日首次封板；续板：连续封板；晋级：昨日 N 板 → 今日 N+1 板；断板：昨日封板今日未封；炸板：触板后开板未再封住。',
  sealPattern:
    '一字板：开盘即封板未开；T 字板：盘中触板回封；普通板：常规封板；烂板：多次开板并伴随大量换手。',
  promoteRate: '晋级率 = 昨日 N 板今日续板数 / 昨日 N 板总数。',
  failRate: '炸板率 = 当日触板后未封住数 / 当日触板总数。',
  pctChgLimit: '该股涨跌停板上限：主板 10%、创业/科创 20%、北交所 30%、ST 5%。',
} as const;

// ----------------------------------------------------------------------
// 板高度推断兜底（后端 BE-3 字段未上线时）
// ----------------------------------------------------------------------

/**
 * 通过 ts_code 兜底推断板高度上限（百分比，不含 %）。
 * 优先返回后端 `pctChgLimit`，否则按交易所规则推断。
 */
export function resolvePctChgLimit(
  item: Pick<LimitListItem, 'tsCode' | 'stockName' | 'pctChgLimit'>
): number {
  if (item.pctChgLimit != null) return item.pctChgLimit;

  const name = (item.stockName ?? '').toUpperCase();
  if (name.includes('ST')) return 5;

  const code = item.tsCode ?? '';
  // 沪深 ts_code 格式 `XXXXXX.YY`；前缀决定板块。
  const numeric = code.split('.')[0] ?? '';
  if (numeric.startsWith('300') || numeric.startsWith('301')) return 20; // 创业板
  if (numeric.startsWith('688')) return 20; // 科创板
  if (numeric.startsWith('8') || numeric.startsWith('4') || numeric.startsWith('92')) return 30; // 北交所
  return 10;
}

export function getStreakDays(item: Pick<LimitListItem, 'consecutiveDays' | 'streakDays'>): number {
  if (item.streakDays != null) return item.streakDays;
  return item.consecutiveDays ?? 0;
}

// ----------------------------------------------------------------------
// 状态文案与配色（基于 theme palette key，避免硬编码颜色）
// ----------------------------------------------------------------------

export const STREAK_STATUS_LABEL: Record<LimitStreakStatus, string> = {
  FIRST_LIMIT: '首板',
  CONSECUTIVE: '续板',
  PROMOTE: '晋级',
  BREAK: '断板',
  FLUSH: '炸板',
};

export type StreakStatusToneColor =
  | 'default'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export const STREAK_STATUS_COLOR: Record<LimitStreakStatus, StreakStatusToneColor> = {
  FIRST_LIMIT: 'info',
  CONSECUTIVE: 'warning',
  PROMOTE: 'error',
  BREAK: 'default',
  FLUSH: 'warning',
};

export const SEAL_PATTERN_LABEL: Record<LimitSealPattern, string> = {
  ONE_WORD: '一字',
  T_SHAPE: 'T 字',
  NORMAL: '普通',
  WEAK: '烂板',
};

export const SEAL_PATTERN_COLOR: Record<LimitSealPattern, StreakStatusToneColor> = {
  ONE_WORD: 'error',
  T_SHAPE: 'warning',
  NORMAL: 'info',
  WEAK: 'default',
};

/**
 * 一字板首封时间语义化。
 * `09:25:xx` 视为集合竞价封板。
 */
export function formatFirstSealTime(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.startsWith('09:25')) return '09:25 集合';
  // 截取 HH:mm
  const match = /^(\d{2}:\d{2})/.exec(value);
  return match ? match[1]! : value;
}
