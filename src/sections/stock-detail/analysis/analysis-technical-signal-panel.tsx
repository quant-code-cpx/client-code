import type { SignalSummary, MaStatusSummary } from 'src/api/stock';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

const SIGNAL_LABELS: Record<string, string> = {
  macd: 'MACD',
  kdj: 'KDJ',
  rsi: 'RSI',
  boll: 'BOLL',
  wr: 'WR',
  cci: 'CCI',
  dmi: 'DMI',
  sar: 'SAR',
  volumePrice: '量价',
};

const SIGNAL_VALUE_LABELS: Record<string, string> = {
  bullish: '看多',
  bearish: '看空',
  neutral: '中性',
  below_zero: '零轴下',
  above_zero: '零轴上',
  oversold: '超卖',
  overbought: '超买',
  near_lower: '近下轨',
  near_upper: '近上轨',
  in_band: '带内',
  no_trend: '无趋势',
  trending: '趋势中',
  golden_cross: '金叉',
  death_cross: '死叉',
};

function getSignalColor(signal: string | null): 'error' | 'success' | 'warning' | 'default' {
  if (!signal) return 'default';
  const s = signal.toLowerCase();
  if (
    s === 'bullish' ||
    s === 'golden_cross' ||
    s.includes('多头') ||
    s.includes('金叉') ||
    s.includes('看多')
  )
    return 'error';
  if (
    s === 'bearish' ||
    s === 'death_cross' ||
    s.includes('空头') ||
    s.includes('死叉') ||
    s.includes('看空')
  )
    return 'success';
  if (s === 'overbought' || s.includes('超买') || s.includes('警告')) return 'warning';
  return 'default';
}

type Props = {
  signals: SignalSummary;
  maStatus: MaStatusSummary;
};

export function AnalysisTechnicalSignalPanel({ signals, maStatus }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          信号摘要
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {(Object.keys(SIGNAL_LABELS) as Array<keyof SignalSummary>).map((key) => {
            const value = signals[key];
            if (!value) return null;
            return (
              <Chip
                key={key}
                label={`${SIGNAL_LABELS[key]}: ${SIGNAL_VALUE_LABELS[value] ?? value}`}
                color={getSignalColor(value)}
                size="small"
                variant="outlined"
              />
            );
          })}
          {maStatus.bullishAlign && <Chip label="MA 多头排列" color="error" size="small" />}
          {maStatus.bearishAlign && <Chip label="MA 空头排列" color="success" size="small" />}
        </Stack>
        {maStatus.latestCross && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              最新穿越: {maStatus.latestCross}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
