import type { ReactNode } from 'react';
import type { KlineBar, DataProvenance, PriceAdjustment } from 'src/types/agent/generated';

export type NormalizedKlineSeries = {
  tsCode: string;
  adjustment: PriceAdjustment;
  timezone: string;
  priceUnit: string;
  volumeUnit: string;
  amountUnit: string;
  bars: KlineBar[];
  provenance?: DataProvenance;
  warnings: string[];
};

export type StockKlineProps = {
  series: NormalizedKlineSeries;
  height?: number;
  chartContent?: ReactNode;
  showHeader?: boolean;
  onOpenStockDetail?: (tsCode: string) => void;
};
