import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// ----------------------------------------------------------------------

/**
 * @Docs
 * https://day.js.org/docs/en/display/format
 */

/**
 * Default timezones
 * https://day.js.org/docs/en/timezone/set-default-timezone#docsNav
 *
 */

/**
 * UTC
 * https://day.js.org/docs/en/plugin/utc
 * @install
 * import utc from 'dayjs/plugin/utc';
 * dayjs.extend(utc);
 * @usage
 * dayjs().utc().format()
 *
 */

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

// ----------------------------------------------------------------------

export type DatePickerFormat = Dayjs | Date | string | number | null | undefined;

export const formatPatterns = {
  dateTime: 'YYYY-MM-DD HH:mm', // 2022-04-17 12:00
  date: 'YYYY-MM-DD', // 2022-04-17
  time: 'HH:mm', // 12:00
  split: {
    dateTime: 'YYYY/MM/DD HH:mm', // 2022/04/17 12:00
    date: 'YYYY/MM/DD', // 2022/04/17
  },
  paramCase: {
    dateTime: 'YYYY-MM-DD HH:mm', // 2022-04-17 12:00
    date: 'YYYY-MM-DD', // 2022-04-17
  },
};

const isValidDate = (date: DatePickerFormat) =>
  date !== null && date !== undefined && dayjs(date).isValid();

// ----------------------------------------------------------------------

/**
 * @output 17 Apr 2022 12:00 am
 */
export function fDateTime(date: DatePickerFormat, template?: string): string {
  if (!isValidDate(date)) {
    return '—';
  }

  return dayjs(date).format(template ?? formatPatterns.dateTime);
}

// ----------------------------------------------------------------------

/**
 * @output 17 Apr 2022
 */
export function fDate(date: DatePickerFormat, template?: string): string {
  if (!isValidDate(date)) {
    return '—';
  }

  return dayjs(date).format(template ?? formatPatterns.date);
}

// ----------------------------------------------------------------------

/**
 * @output 几秒前、2 小时前、3 天前（中文）
 */
export function fToNow(date: DatePickerFormat): string {
  if (!isValidDate(date)) {
    return '—';
  }

  return dayjs(date).locale('zh-cn').toNow(true);
}

// ----------------------------------------------------------------------

/**
 * Format a trade date string to the given dayjs format (default `YYYY-MM-DD`).
 *
 * Handles three input shapes produced by Tushare/backend:
 *   - `YYYYMMDD`  (8-digit compact, e.g. `"20240115"`)
 *   - ISO datetime string  (e.g. `"2024-01-15T00:00:00.000Z"`)
 *   - Already-formatted date string  (e.g. `"2024-01-15"`)
 *
 * @example
 *   fmtTradeDate('20240115')            // → '2024-01-15'
 *   fmtTradeDate('20240115', 'MM-DD')   // → '01-15'
 *   fmtTradeDate('20240115', 'MM/DD')   // → '01/15'
 */
export function fmtTradeDate(d: string, fmt = 'YYYY-MM-DD'): string {
  if (!d) return d;
  if (/^\d{8}$/.test(d)) return dayjs(d, 'YYYYMMDD').format(fmt);
  if (d.includes('T')) return dayjs(d).format(fmt);
  return dayjs(d).format(fmt);
}

// ----------------------------------------------------------------------

/**
 * Convert period string to approximate trading day count.
 * Used when passing period to backend endpoints that expect `days: number`.
 *
 * @example
 *   periodToDays('1w')  // → 5
 *   periodToDays('1m')  // → 20
 *   periodToDays('3m')  // → 60
 */
const PERIOD_DAYS_MAP: Record<string, number> = {
  '1w': 5,
  '1m': 20,
  '3m': 60,
  '6m': 120,
  '1y': 250,
};

export function periodToDays(period: string): number {
  return PERIOD_DAYS_MAP[period] ?? 20;
}
