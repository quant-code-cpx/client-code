import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import type { MarketPeriod, MarketKLineData } from './market-kline.types';

function formatNumber(value: number | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(value);
}

function LegendValue({ label, value }: { label: string; value: string }) {
  return (
    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
      {label}
      <Box component="span" sx={{ ml: 0.5, color: 'text.primary', fontWeight: 600 }}>
        {value}
      </Box>
    </Typography>
  );
}

export function MarketKlineLegend({
  bar,
  period,
}: {
  bar: MarketKLineData | null;
  period: MarketPeriod;
}) {
  const dateLabel = bar
    ? period === 'T'
      ? `${fmtTradeDate(bar.tradeDate)} ${bar.time ?? ''}`
      : fmtTradeDate(bar.tradeDate)
    : '—';

  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      aria-label="行情图例"
      sx={{ minHeight: 28, mb: 0.5, fontVariantNumeric: 'tabular-nums' }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 116 }}>
        {dateLabel}
      </Typography>
      <LegendValue label="开" value={formatNumber(bar?.open)} />
      <LegendValue label="高" value={formatNumber(bar?.high)} />
      <LegendValue label="低" value={formatNumber(bar?.low)} />
      <LegendValue label="收" value={formatNumber(bar?.close)} />
      {period === 'T' ? <LegendValue label="均价" value={formatNumber(bar?.avgPrice)} /> : null}
      <LegendValue label="成交量" value={`${formatNumber(bar?.volumeHands, 0)} 手`} />
      <LegendValue label="成交额" value={`${formatNumber(bar?.amountThousands, 0)} 千元`} />
    </Stack>
  );
}
