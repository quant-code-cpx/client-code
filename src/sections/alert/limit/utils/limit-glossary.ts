import type { LimitType, LimitListItem, LimitSealPattern, LimitStreakStatus } from 'src/api/alert';

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
    '一字板：开盘即封板未开；早封：10:00 前封板；晚封：10:00 后封板；回封：盘中开板后再次封住。',
  promoteRate: '晋级率 = 昨日 N 板今日续板数 / 昨日 N 板总数。',
  failRate: '炸板率 = 当日触板后未封住数 / 当日触板总数。',
  pctChgLimit: '该股涨跌停板上限：主板 10%、创业/科创 20%、北交所 30%、ST 5%。',
} as const;

// ----------------------------------------------------------------------
// 板高度推断兜底（后端 BE-3 字段未上线时）
// ----------------------------------------------------------------------

const VALID_LIMIT_PCTS = new Set([5, 10, 20, 30]);

/**
 * 通过 ts_code 兜底推断板高度上限（百分比，不含 %）。
 * 优先返回后端 `pctChgLimit`，否则按交易所规则推断。
 */
export function resolvePctChgLimit(
  item: Pick<LimitListItem, 'tsCode' | 'stockName' | 'pctChgLimit'>
): number {
  const pctChgLimit = Math.abs(item.pctChgLimit ?? Number.NaN);
  if (VALID_LIMIT_PCTS.has(pctChgLimit)) return pctChgLimit;

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

export type LimitToneColor = 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error';

export const LIMIT_TYPE_LABEL: Record<LimitType, string> = {
  UP: '涨停',
  DOWN: '跌停',
  BROKEN: '炸板',
};

export const LIMIT_TYPE_COLOR: Record<LimitType, LimitToneColor> = {
  UP: 'error',
  DOWN: 'success',
  BROKEN: 'warning',
};

export const STREAK_STATUS_LABEL: Record<LimitStreakStatus, string> = {
  FIRST_LIMIT: '首板',
  CONSECUTIVE: '续板',
  PROMOTE: '晋级',
  BREAK: '断板',
  FLUSH: '炸板',
};

export const STREAK_STATUS_COLOR: Record<LimitStreakStatus, LimitToneColor> = {
  FIRST_LIMIT: 'info',
  CONSECUTIVE: 'warning',
  PROMOTE: 'error',
  BREAK: 'default',
  FLUSH: 'warning',
};

export const SEAL_PATTERN_LABEL: Record<LimitSealPattern, string> = {
  ONE_LINE: '一字板',
  EARLY_SEAL: '早封',
  LATE_SEAL: '晚封',
  REOPENED: '回封',
};

export const SEAL_PATTERN_COLOR: Record<LimitSealPattern, LimitToneColor> = {
  ONE_LINE: 'error',
  EARLY_SEAL: 'info',
  LATE_SEAL: 'default',
  REOPENED: 'warning',
};

/**
 * 一字板首封时间语义化。
 * `09:25:xx` 视为集合竞价封板。
 */
export function formatFirstSealTime(value: string | null | undefined): string {
  if (!value) return '—';
  if (value.startsWith('09:25')) return '09:25 集合';
  // 截取 HH:mm（标准格式 "HH:MM:SS"）
  const match = /^(\d{2}:\d{2})/.exec(value);
  if (match) return match[1]!;
  // 处理后端返回的 HMMSS / HHMMSS 整数字符串，例如 "92500" → "09:25", "93003" → "09:30"
  const intMatch = /^(\d{1,2})(\d{2})\d{2}$/.exec(value);
  if (intMatch) {
    const hh = intMatch[1]!.padStart(2, '0');
    const mm = intMatch[2]!;
    if (hh === '09' && mm === '25') return '09:25 集合';
    return `${hh}:${mm}`;
  }
  return value;
}
