/**
 * Canonical display names for A-share / HK / BJ indices by TS code.
 * Single source of truth — previously duplicated in market-daily-snapshot-card,
 * market-index-cards, and dashboard-market-pulse.
 */
export const INDEX_NAME_MAP: Record<string, string> = {
  '000001.SH': '上证指数',
  '000010.SH': '上证180',
  '000016.SH': '上证50',
  '000300.SH': '沪深300',
  '000688.SH': '科创50',
  '000698.SH': '科创100',
  '000852.SH': '中证1000',
  '000903.SH': '中证100',
  '000905.SH': '中证500',
  '000985.SH': '中证全指',
  '399001.SZ': '深证成指',
  '399005.SZ': '中小100',
  '399006.SZ': '创业板指',
  '399107.SZ': '深证综指',
  '399330.SZ': '深证100',
  '399673.SZ': '创业板50',
  '899050.BJ': '北证50',
  '932000.CSI': '中证2000',
};
