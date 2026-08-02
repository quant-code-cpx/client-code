import { useState } from 'react';

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

import { MarketKlineChart } from './market-kline-chart';
import { MarketChartToolbar } from './market-chart-toolbar';

import type {
  MarketPeriod,
  MarketAdjustType,
  MarketSubIndicator,
  MarketMainIndicator,
} from './market-kline.types';

export function MarketChartCard({ tsCode }: { tsCode: string }) {
  const [period, setPeriod] = useState<MarketPeriod>('D');
  const [adjustType, setAdjustType] = useState<MarketAdjustType>('qfq');
  const [mainIndicator, setMainIndicator] = useState<MarketMainIndicator>('MA');
  const [subIndicator, setSubIndicator] = useState<MarketSubIndicator>('VOL');
  const [resetToken, setResetToken] = useState(0);
  const [retryToken, setRetryToken] = useState(0);

  return (
    <Card>
      <CardContent>
        <MarketChartToolbar
          period={period}
          adjustType={adjustType}
          mainIndicator={mainIndicator}
          subIndicator={subIndicator}
          onPeriodChange={setPeriod}
          onAdjustTypeChange={setAdjustType}
          onMainIndicatorChange={setMainIndicator}
          onSubIndicatorChange={setSubIndicator}
          onReset={() => setResetToken((value) => value + 1)}
        />
        <MarketKlineChart
          tsCode={tsCode}
          period={period}
          adjustType={adjustType}
          mainIndicator={mainIndicator}
          subIndicator={subIndicator}
          resetToken={resetToken}
          retryToken={retryToken}
          onRetry={() => setRetryToken((value) => value + 1)}
        />
      </CardContent>
    </Card>
  );
}
