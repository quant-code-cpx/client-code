type StockLimitLabel = {
  label: '涨停' | '一字涨停' | '跌停' | '一字跌停';
  color: 'error' | 'success';
};

/** Tushare daily_basic.limit_status：0 平盘，1 普涨，2 涨停，3 一字涨停，4 普跌，5 跌停，6 一字跌停。 */
export function mapLimitStatus(value: number | null | undefined): StockLimitLabel | null {
  if (value === 2) return { label: '涨停', color: 'error' };
  if (value === 3) return { label: '一字涨停', color: 'error' };
  if (value === 5) return { label: '跌停', color: 'success' };
  if (value === 6) return { label: '一字跌停', color: 'success' };
  return null;
}
