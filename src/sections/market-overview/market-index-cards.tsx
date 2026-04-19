import type { IndexQuoteItem } from 'src/api/market';

import { varAlpha } from 'minimal-shared/utils';
import { useId, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { fQianYuan } from 'src/utils/format-number';

import { fetchIndexQuote, fetchIndexTrend } from 'src/api/market';

import { ColoredNumber } from 'src/components/colored-number';

// ----------------------------------------------------------------------

const INDEX_NAME_MAP: Record<string, string> = {
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
  '399006.SZ': '创业板指',
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
};

// ── SVG Sparkline ───────────────────────────────────────────

function Sparkline({
  data,
  color,
  height = 48,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const gradientId = useId();

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 200;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${w},${height}`} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Index Card ──────────────────────────────────────────────

function IndexCard({
  item,
  sparklineData,
}: {
  item: IndexQuoteItem;
  sparklineData: number[];
}) {
  const theme = useTheme();
  const name = INDEX_NAME_MAP[item.tsCode] ?? item.tsCode;
  const isPositive = (item.pctChg ?? 0) > 0;
  const isNegative = (item.pctChg ?? 0) < 0;

  const accentColor = isPositive
    ? theme.palette.error.main
    : isNegative
      ? theme.palette.success.main
      : theme.palette.text.disabled;

  const accentChannel = isPositive
    ? theme.vars.palette.error.mainChannel
    : isNegative
      ? theme.vars.palette.success.mainChannel
      : theme.vars.palette.text.disabledChannel;

  return (
    <Card
      component={RouterLink}
      href={`/market/index?code=${item.tsCode}`}
      sx={{
        textDecoration: 'none',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
        borderBottom: `3px solid ${accentColor}`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px 0 ${varAlpha(accentChannel, 0.16)}`,
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1, pb: '16px !important' }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            display: 'block',
            mb: 0.5,
            fontWeight: 600,
            letterSpacing: 0.5,
          }}
        >
          {name}
        </Typography>

        <Typography variant="h5" fontWeight="fontWeightBold" sx={{ mb: 0.5 }}>
          {item.close != null ? item.close.toFixed(2) : '-'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <ColoredNumber
            value={item.pctChg}
            format="percent"
            variant="body2"
            sx={{ fontWeight: 'fontWeightBold' }}
          />
          <ColoredNumber value={item.change} format="change" variant="caption" />
        </Box>

        <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
          {item.amount != null ? fQianYuan(item.amount) : '-'}
        </Typography>
      </CardContent>

      {/* Sparkline background overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <Sparkline data={sparklineData} color={accentColor} />
      </Box>
    </Card>
  );
}

function IndexCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="55%" />
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketIndexCards({ tradeDate }: Props) {
  const [data, setData] = useState<IndexQuoteItem[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexQuote({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) {
          const items = res ?? [];
          setData(items);

          // Load sparkline data for each index in parallel
          const codes = items.map((i) => i.tsCode);
          Promise.allSettled(
            codes.map((code) => fetchIndexTrend({ ts_code: code, period: '1m' }))
          ).then((results) => {
            if (cancelled) return;
            const map: Record<string, number[]> = {};
            results.forEach((r, i) => {
              if (r.status === 'fulfilled' && r.value?.data) {
                map[codes[i]] = r.value.data.map((d) => d.close);
              }
            });
            setSparklines(map);
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载指数行情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  if (error) {
    return (
      <Grid size={12}>
        <Alert severity="error">{error}</Alert>
      </Grid>
    );
  }

  const skeletonKeys = Array.from({ length: 6 }, (_, i) => i);

  return (
    <>
      {loading
        ? skeletonKeys.map((k) => (
            <Grid key={k} size={{ xs: 6, sm: 4, md: 2 }}>
              <IndexCardSkeleton />
            </Grid>
          ))
        : data.map((item) => (
            <Grid key={item.tsCode} size={{ xs: 6, sm: 4, md: 2 }}>
              <IndexCard item={item} sparklineData={sparklines[item.tsCode] ?? []} />
            </Grid>
          ))}
    </>
  );
}
