import type { MarketBreadthResult } from 'src/api/market';

export type MarketTone = 'bullish' | 'bearish' | 'divergent' | 'neutral';

export type MarketHeroData = {
  tone: MarketTone;
  breadth: MarketBreadthResult;
  moneyFlowYi: number | null;
  sentimentScore: number | null;
  sentimentLabel: string;
  tradeDate: string;
};

export function deriveMarketTone(
  breadth: MarketBreadthResult,
  moneyFlowYi: number | null
): MarketTone {
  const total = breadth.total || 1;
  const riseRatio = (breadth.bigRise + breadth.rise) / total;
  const fallRatio = (breadth.bigFall + breadth.fall) / total;
  const capitalIn = (moneyFlowYi ?? 0) >= 0;

  if (riseRatio > 0.55 && capitalIn) return 'bullish';
  if (fallRatio > 0.55 && !capitalIn) return 'bearish';
  if (Math.abs(riseRatio - fallRatio) < 0.2) return 'neutral';
  return 'divergent';
}

export function buildMarketHeadline(
  tone: MarketTone,
  breadth: MarketBreadthResult,
  moneyFlowYi: number | null
): string {
  const total = breadth.total || 1;
  const riseRatio = (breadth.bigRise + breadth.rise) / total;

  const coreLabel =
    tone === 'bullish'
      ? riseRatio > 0.68
        ? '全面普涨，多头情绪占优'
        : '多头格局，量能配合'
      : tone === 'bearish'
        ? riseRatio < 0.25
          ? '全面普跌，空头主导'
          : '调整压力较重'
        : tone === 'divergent'
          ? '结构性分化，局部机会显现'
          : '震荡整理，方向待明';

  const addons: string[] = [];
  if (breadth.limitUp > 80) addons.push(`涨停潮 ${breadth.limitUp} 家`);
  if ((moneyFlowYi ?? 0) > 100) addons.push('主力大幅流入');
  else if ((moneyFlowYi ?? 0) < -100) addons.push('主力大幅撤离');

  return addons.length > 0 ? `${coreLabel} · ${addons.join(' · ')}` : coreLabel;
}

export function getSentimentLabel(score: number): string {
  if (score < 20) return '极度恐惧';
  if (score < 40) return '偏恐惧';
  if (score < 60) return '中性';
  if (score < 80) return '偏贪婪';
  return '极度贪婪';
}
