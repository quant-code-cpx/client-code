import type { KLineData } from 'klinecharts';

export type MarketPeriod = 'T' | 'D' | 'W' | 'M';

export type MarketKlinePeriod = Exclude<MarketPeriod, 'T'>;

export type MarketAdjustType = 'none' | 'qfq' | 'hfq';

export type MarketMainIndicator = 'MA' | 'BOLL' | 'NONE';

export type MarketSubIndicator = 'VOL' | 'MACD' | 'KDJ' | 'RSI' | 'NONE';

export type MarketChartStatus = 'loading' | 'ready' | 'partial' | 'stale' | 'empty' | 'error';

export type MarketKLineData = KLineData & {
  tradeDate: string;
  time?: string;
  preClose?: number;
  avgPrice?: number;
  pctChg?: number;
  volumeHands?: number;
  amountThousands?: number;
  ma5?: number;
  ma10?: number;
  ma20?: number;
  ma60?: number;
};

export type MarketDataResult = {
  bars: MarketKLineData[];
  rejectedCount: number;
  duplicateCount: number;
};
