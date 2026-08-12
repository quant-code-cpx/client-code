import type { FactorDef } from 'src/api/factor';

const TRADE_DATE_PATTERN = /^\d{8}$/;

/**
 * 因子库接口没有单独的交易日字段，但每个因子都带后端快照 latestDate。
 * 最大合法快照日期即当前用户可访问的最近已知有效交易日；无快照时不猜自然日。
 */
export function resolveLatestFactorTradeDate(factors: FactorDef[]): string | null {
  return factors.reduce<string | null>((latest, factor) => {
    const candidate = factor.latestDate;
    if (!candidate || !TRADE_DATE_PATTERN.test(candidate)) return latest;
    return !latest || candidate > latest ? candidate : latest;
  }, null);
}
