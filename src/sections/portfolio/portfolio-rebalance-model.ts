import type { StockSearchItem } from 'src/api/stock';
import type { RebalanceAction, HoldingDetailItem } from 'src/api/portfolio';

export type RebalanceTargetRow = {
  stock: StockSearchItem | null;
  targetWeight: number;
};

export const REBALANCE_ACTION_LABELS: Record<string, string> = {
  BUY: '买入',
  SELL: '卖出',
  ADJUST: '调整',
  HOLD: '持有',
};

export const REBALANCE_ACTION_COLORS: Record<
  string,
  'success' | 'error' | 'info' | 'default' | 'warning' | 'primary' | 'secondary'
> = {
  BUY: 'success',
  SELL: 'error',
  ADJUST: 'info',
  HOLD: 'default',
};

export const EMPTY_REBALANCE_TARGET: RebalanceTargetRow = { stock: null, targetWeight: 0 };

export function toOptionalRebalanceNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Number(trimmed);
}

export function stockFromHolding(holding: HoldingDetailItem): StockSearchItem {
  return {
    tsCode: holding.tsCode,
    symbol: '',
    name: holding.stockName,
    market: null,
    industry: holding.industry,
    listStatus: null,
  };
}

export function buildRebalanceOrderText(actions: RebalanceAction[]): string {
  const rows = actions
    .filter((action) => action.deltaQuantity !== 0)
    .map((action) => {
      const direction = action.deltaQuantity > 0 ? '买入' : '卖出';
      return [direction, action.tsCode, action.stockName, Math.abs(action.deltaQuantity)].join('\t');
    });

  if (rows.length === 0) return '无需调仓，当前持仓已符合目标权重。';
  return ['方向\t股票代码\t股票名称\t数量', ...rows].join('\n');
}
