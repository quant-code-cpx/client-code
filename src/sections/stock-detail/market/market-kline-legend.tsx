import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { calculatePriceChange } from './market-kline-data';

import type { MarketPeriod, MarketKLineData } from './market-kline.types';

type LegendColor = 'text.primary' | 'text.secondary' | 'error.main' | 'success.main';

const SIGNED_NUMBER_FORMATTER = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatNumber(value: number | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(value);
}

function formatSignedNumber(value: number | null, suffix = ''): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const normalized = normalizeSignedDisplayValue(value);
  return `${normalized > 0 ? '+' : ''}${SIGNED_NUMBER_FORMATTER.format(normalized)}${suffix}`;
}

function normalizeSignedDisplayValue(value: number): number {
  const stabilized = Number(value.toFixed(10));
  return Math.abs(stabilized) < 0.005 ? 0 : stabilized;
}

function directionColor(value: number | null): LegendColor {
  if (value == null) return 'text.secondary';
  const normalized = normalizeSignedDisplayValue(value);
  if (normalized === 0) return 'text.secondary';
  return normalized > 0 ? 'error.main' : 'success.main';
}

function LegendValue({
  label,
  value,
  color = 'text.primary',
}: {
  label: string;
  value: string;
  color?: LegendColor;
}) {
  return (
    <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
      {label}
      <Box component="span" sx={{ ml: 0.5, color, fontWeight: 600 }}>
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
  const priceChange = period === 'T' ? calculatePriceChange(bar?.close, bar?.preClose) : null;
  const amountChangeColor = directionColor(priceChange?.amount ?? null);
  const percentChangeColor = directionColor(priceChange?.percent ?? null);

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
      {period === 'T' ? (
        <>
          <LegendValue
            label="涨跌额"
            value={formatSignedNumber(priceChange?.amount ?? null)}
            color={amountChangeColor}
          />
          <LegendValue
            label="涨跌幅"
            value={formatSignedNumber(priceChange?.percent ?? null, '%')}
            color={percentChangeColor}
          />
          <LegendValue label="均价" value={formatNumber(bar?.avgPrice)} />
        </>
      ) : null}
      <LegendValue label="成交量" value={`${formatNumber(bar?.volumeHands, 0)} 手`} />
      <LegendValue label="成交额" value={`${formatNumber(bar?.amountThousands, 0)} 千元`} />
    </Stack>
  );
}
