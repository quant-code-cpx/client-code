import type { HsgtTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { fetchHsgtFlow } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const SPARKLINE_DAYS = 10;

/** 百万元 → 亿元 */
function toYi(v: number | null | undefined): number {
  return v != null ? v / 100 : 0;
}

function flowColor(v: number | null | undefined): 'error.main' | 'success.main' | 'text.secondary' {
  if (v == null) return 'text.secondary';
  if (v > 0) return 'error.main';
  if (v < 0) return 'success.main';
  return 'text.secondary';
}

function formatYi(v: number | null | undefined): string {
  if (v == null) return '-';
  const yi = toYi(v);
  return `${yi > 0 ? '+' : ''}${yi.toFixed(2)}亿`;
}

// ── Mini Sparkline (SVG) ─────────────────────────────────────────

function MiniSparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const theme = useTheme();
  const color = positive ? theme.palette.error.main : theme.palette.success.main;
  const w = 80;
  const h = 28;

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
}

// ── Flow Channel ─────────────────────────────────────────────────

type ChannelProps = {
  label: string;
  value: number | null | undefined;
  history: number[];
};

function FlowChannel({ label, value, history }: ChannelProps) {
  const theme = useTheme();
  const isPositive = (value ?? 0) > 0;
  const colorKey = flowColor(value);

  const resolveColor = () => {
    if (colorKey === 'error.main') return theme.palette.error.main;
    if (colorKey === 'success.main') return theme.palette.success.main;
    return theme.palette.text.secondary;
  };
  const color = resolveColor();

  return (
    <Box sx={{ flex: 1 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatYi(value)}
        </Typography>
        <MiniSparkline values={history} positive={isPositive} />
      </Stack>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────

type Props = {
  tradeDate?: string;
  /** If provided by parent, skip internal fetch (avoids duplicate API call) */
  history?: HsgtTrendItem[];
};

export function MarketHsgtMiniCard({ tradeDate, history: externalHistory }: Props) {
  const theme = useTheme();
  const [fetchedHistory, setFetchedHistory] = useState<HsgtTrendItem[]>([]);
  const [loading, setLoading] = useState(!externalHistory);
  const [error, setError] = useState('');

  // Use externally provided history when available
  const history = externalHistory ?? fetchedHistory;

  useEffect(() => {
    // Skip internal fetch when parent is providing data
    if (externalHistory !== undefined) {
      setLoading(false);
      return () => {};
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHsgtFlow({ trade_date: tradeDate, days: SPARKLINE_DAYS })
      .then((res) => {
        if (!cancelled) setFetchedHistory(res?.history ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载沪深港通数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, externalHistory]);

  const today = history[history.length - 1] ?? null;
  const northHistory = history.map((d) => toYi(d.northMoney));
  const hgtHistory = history.map((d) => toYi(d.hgt));
  const sgtHistory = history.map((d) => toYi(d.sgt));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ pb: '16px !important' }}>
        {/* ── Header ── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.1),
              }}
            >
              <Iconify icon="solar:wallet-bold" width={18} sx={{ color: 'warning.main' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>
              北向资金
            </Typography>
          </Stack>

          <Box
            component={RouterLink}
            href="/market/money-flow"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'primary.main',
              fontSize: 12,
              textDecoration: 'none',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            查看详情
            <Iconify icon="solar:arrow-right-bold" width={14} />
          </Box>
        </Stack>

        {loading ? (
          <>
            <Skeleton variant="text" width="50%" height={40} />
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="rectangular" height={4} sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={2}>
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="text" width="50%" />
            </Stack>
          </>
        ) : error ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {error}
          </Typography>
        ) : !today ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            暂无数据
          </Typography>
        ) : (
          <>
            {/* ── Total North ── */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
              >
                合计北向（今日）
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{
                    color: flowColor(today.northMoney),
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatYi(today.northMoney)}
                </Typography>
                <MiniSparkline values={northHistory} positive={(today.northMoney ?? 0) > 0} />
              </Stack>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* ── Sub channels ── */}
            <Stack
              direction="row"
              spacing={2}
              divider={<Divider orientation="vertical" flexItem />}
            >
              <FlowChannel label="沪股通" value={today.hgt} history={hgtHistory} />
              <FlowChannel label="深股通" value={today.sgt} history={sgtHistory} />
            </Stack>

            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', display: 'block', mt: 1.5, textAlign: 'right' }}
            >
              近{SPARKLINE_DAYS}日走势 · 单位：亿元
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  );
}
