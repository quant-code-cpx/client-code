/*
 * Locales code
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */

export type InputNumberValue = string | number | null | undefined;

type Options = Intl.NumberFormatOptions;

const DEFAULT_LOCALE = { code: 'en-US', currency: 'USD' };

function processInput(inputValue: InputNumberValue): number | null {
  if (inputValue == null || Number.isNaN(inputValue)) return null;
  return Number(inputValue);
}

// ----------------------------------------------------------------------

export function fNumber(inputValue: InputNumberValue, options?: Options) {
  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------

export function fCurrency(inputValue: InputNumberValue, options?: Options) {
  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    style: 'currency',
    currency: locale.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm;
}

// ----------------------------------------------------------------------

export function fPercent(inputValue: InputNumberValue, options?: Options) {
  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    ...options,
  }).format(number / 100);

  return fm;
}

// ----------------------------------------------------------------------

export function fShortenNumber(inputValue: InputNumberValue, options?: Options) {
  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = new Intl.NumberFormat(locale.code, {
    notation: 'compact',
    maximumFractionDigits: 2,
    ...options,
  }).format(number);

  return fm.replace(/[A-Z]/g, (match) => match.toLowerCase());
}

// ----------------------------------------------------------------------

/**
 * 将「万元」单位的数值格式化为带中文单位的字符串。
 * 适用于：总市值(totalMv)、流通市值(circMv) 等 Tushare 以万元为单位的字段。
 *
 * @param value  - 原始值（万元），null 返回 '-'
 * @param decimals - 小数位数，默认 2
 */
export function fWanYuan(value: InputNumberValue, decimals = 2): string {
  const num = processInput(value);
  if (num === null) return '-';
  if (Math.abs(num) >= 10000) return `${(num / 10000).toFixed(decimals)}亿`;
  return `${num.toFixed(0)}万`;
}

/**
 * 将「千元」单位的数值格式化为带中文单位的字符串。
 * 适用于：成交额(amount) 等 Tushare 以千元为单位的字段。
 *
 * @param value  - 原始值（千元），null 返回 '-'
 * @param decimals - 亿级小数位数，默认 2
 */
export function fQianYuan(value: InputNumberValue, decimals = 2): string {
  const num = processInput(value);
  if (num === null) return '-';
  // 1亿 = 100,000千元
  if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(decimals)}亿`;
  // 1万 = 10千元
  if (Math.abs(num) >= 10) return `${(num / 10).toFixed(0)}万`;
  return `${num.toFixed(2)}千`;
}

/**
 * 格式化涨跌幅：自动补 '+'/'-' 前缀，保留指定小数位，结尾加 '%'。
 * null 返回 '-'。
 *
 * @param value    - 涨跌幅数值（百分比，如 1.85 表示 +1.85%）
 * @param decimals - 小数位数，默认 2
 */
export function fPctChg(value: InputNumberValue, decimals = 2): string {
  const num = processInput(value);
  if (num === null) return '-';
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(decimals)}%`;
}

/**
 * 格式化带百分号的比率类字段（换手率、股息率等）。
 * null 返回 '-'。
 *
 * @param value    - 原始数值（已是百分比形式，如 0.23 表示 0.23%）
 * @param decimals - 小数位数，默认 2
 */
export function fRatePercent(value: InputNumberValue, decimals = 2): string {
  const num = processInput(value);
  if (num === null) return '-';
  return `${num.toFixed(decimals)}%`;
}
