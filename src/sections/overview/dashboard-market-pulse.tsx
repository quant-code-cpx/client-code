import type { IndexQuoteWithSparklineItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fPercent, fShortenNumber } from 'src/utils/format-number';

import { fetchIndexQuoteWithSparkline } from 'src/api/market';

// ----------------------------------------------------------------------

const INDEX_NAME_MAP: Record<string, string> = {
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
  '399006.SZ': '创业板指',
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000688.SH': '科创50',
};

// ----------------------------------------------------------------------

function MiniSparkline({ data, color }: { data: (number | null)[]; color: string }) {
  const filtered = data.filter((v): v is number => v !== null);
  if (filtered.length < 2) return null;

  const min = Math.min(...filtered);
  const max = Math.max(...filtered);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const step = w / (filtered.length - 1);

  const points = filtered
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

function PulseCard({ item }: { item: IndexQuoteWithSparklineItem }) {
  const theme = useTheme();
  const pct = item.pctChg ?? 0;
  const isUp = pct > 0;
  const isFlat = pct === 0;
  const color = isFlat
    ? theme.palette.text.secondary
    : isUp
      ? theme.palette.error.main
      : theme.palette.success.main;

  const name = INDEX_NAME_MAP[item.tsCode] || item.tsCode;

  return (
    <Card
      sx={{
        px: 2,
        py: 1.5,
        minWidth: 170,
        flex: '1 1 0',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: color,
          boxShadow: `0 0 0 1px ${color}`,
        },
      }}
    >
      {/* Sparkline background */}
      <Box sx={{ position: 'absolute', right: 8, bottom: 0, opacity: 0.6 }}>
        <MiniSparkline data={item.sparkline ?? []} color={color} />
      </Box>

      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, fontSize: 11 }}
      >
        {name}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.25 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {item.close?.toFixed(2) ?? '—'}
        </Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 700, fontSize: 12 }}>
          {isUp ? '+' : ''}
          {fPercent(pct)}
        </Typography>
      </Stack>

      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', fontSize: 10, mt: 0.25, display: 'block' }}
      >
        量&nbsp;{fShortenNumber((item.amount ?? 0) * 1000 || 0)}
      </Typography>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function DashboardMarketPulse() {
  const [indices, setIndices] = useState<IndexQuoteWithSparklineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIndexQuoteWithSparkline({ sparkline_period: '1m' })
      .then((res) => setIndices(res.indices ?? []))
      .catch(() => setIndices([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Stack direction="row" spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" width={170} height={80} />
        ))}
      </Stack>
    );
  }

  if (indices.length === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        overflowX: 'auto',
        pb: 0.5,
        '::-webkit-scrollbar': { height: 4 },
        '::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
      }}
    >
      {indices.map((item) => (
        <PulseCard key={item.tsCode} item={item} />
      ))}
    </Stack>
  );
}
