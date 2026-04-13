import type { StockSearchItem } from 'src/api/stock';

// ----------------------------------------------------------------------

export function createMockStockSearchItem(overrides?: Partial<StockSearchItem>): StockSearchItem {
  return {
    tsCode: '000001.SZ',
    symbol: '000001',
    name: '平安银行',
    market: '主板',
    industry: '银行',
    listStatus: 'L',
    ...overrides,
  };
}
