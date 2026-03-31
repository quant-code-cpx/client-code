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

function getSignalColor(signal: string | null): 'error' | 'success' | 'warning' | 'default' {
  if (!signal) return 'default';
  if (signal.includes('多头') || signal.includes('金叉') || signal.includes('看多')) return 'error';
  if (signal.includes('空头') || signal.includes('死叉') || signal.includes('看空')) return 'success';
  if (signal.includes('超买') || signal.includes('警告')) return 'warning';
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
        <Typography variant="subtitle1" sx={{ mb: 2 }}>信号摘要</Typography>
        <Stack direction="row" flexWrap="wrap" gap={1}>
          {(Object.keys(SIGNAL_LABELS) as Array<keyof SignalSummary>).map((key) => {
            const value = signals[key];
            if (!value) return null;
            return (
              <Chip
                key={key}
                label={`${SIGNAL_LABELS[key]}: ${value}`}
                color={getSignalColor(value)}
                size="small"
                variant="outlined"
              />
            );
          })}
          {maStatus.bullishAlign && (
            <Chip label="MA 多头排列" color="error" size="small" />
          )}
          {maStatus.bearishAlign && (
            <Chip label="MA 空头排列" color="success" size="small" />
          )}
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
