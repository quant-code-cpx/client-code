import type { WatchlistStock } from 'src/api/watchlist';

// ----------------------------------------------------------------------

export type TargetDistance = {
  /** 距离目标的百分比；正数=尚未到达（仍需上涨），负数=已超过 */
  pct: number;
  /** 是否触达目标（包括上方触达） */
  hit: boolean;
};

/**
 * 基于现价 close 与 targetPrice 计算到目标价的距离百分比。
 * - 当 close 或 targetPrice 缺失时返回 null。
 * - hit 判定：close >= targetPrice（多头目标价口径）。
 */
export function computeTargetDistance(stock: WatchlistStock): TargetDistance | null {
  const close = stock.quote?.close ?? null;
  const target = stock.targetPrice;
  if (close == null || target == null || target === 0) return null;
  const pct = ((target - close) / target) * 100;
  return { pct, hit: close >= target };
}
