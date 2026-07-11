import type { SectorTopBottomItem, SectorTopBottomResult } from 'src/api/market';

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
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { RouterLink } from 'src/routes/components';

import { fetchSectorTopBottom } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ── Types ──────────────────────────────────────────────────────

type ViewDim = 'pct_change' | 'net_amount';

type Props = {
  tradeDate?: string;
  refreshKey?: number;
};

// ── Sector Row ─────────────────────────────────────────────────

function SectorRow({
  rank,
  item,
  barValue,
  maxAbsValue,
  displayValue,
  isPositive,
}: {
  rank: number;
  item: SectorTopBottomItem;
  barValue: number;
  maxAbsValue: number;
  displayValue: string;
  isPositive: boolean;
}) {
  const theme = useTheme();
  const accentColor = isPositive ? theme.palette.error.main : theme.palette.success.main;
  const accentChannel = isPositive
    ? theme.vars.palette.error.mainChannel
    : theme.vars.palette.success.mainChannel;
  const barWidth = maxAbsValue > 0 ? Math.min((Math.abs(barValue) / maxAbsValue) * 100, 100) : 0;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        py: 0.75,
        px: 1,
        borderRadius: 1,
        transition: 'background-color 0.15s',
        '&:hover': { bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.06) },
      }}
    >
      {/* Rank */}
      <Typography
        variant="caption"
        sx={{
          width: 18,
          flexShrink: 0,
          color: rank <= 3 ? accentColor : 'text.disabled',
          fontWeight: rank <= 3 ? 700 : 400,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {rank}
      </Typography>

      {/* Name */}
      <Typography
        variant="body2"
        noWrap
        sx={{ flex: 1, fontWeight: 500, color: 'text.primary', fontSize: 13 }}
      >
        {item.name ?? item.tsCode}
      </Typography>

      {/* Value + bar */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
        <Box
          sx={{
            width: 48,
            height: 4,
            borderRadius: 2,
            bgcolor: varAlpha(accentChannel, 0.15),
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${barWidth}%`,
              bgcolor: accentColor,
              borderRadius: 2,
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: accentColor,
            fontVariantNumeric: 'tabular-nums',
            minWidth: 56,
            textAlign: 'right',
          }}
        >
          {displayValue}
        </Typography>
      </Stack>
    </Stack>
  );
}

// ── Main Component ──────────────────────────────────────────────

export function MarketSectorPanel({ tradeDate, refreshKey }: Props) {
  const theme = useTheme();
  // Toggle only switches the DISPLAYED dimension — no re-fetch
  const [viewDim, setViewDim] = useState<ViewDim>('pct_change');
  const [result, setResult] = useState<SectorTopBottomResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Single fetch per tradeDate — both pct_change and net_amount lists come at once
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSectorTopBottom({ trade_date: tradeDate, top_n: 5 })
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载行业数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, refreshKey]);

  // Derive displayed lists and value formatter from viewDim — no API call
  const gainers =
    viewDim === 'pct_change' ? (result?.pctGainers ?? []) : (result?.flowGainers ?? []);
  const losers = viewDim === 'pct_change' ? (result?.pctLosers ?? []) : (result?.flowLosers ?? []);
  const metricValue = (item: SectorTopBottomItem) =>
    viewDim === 'pct_change' ? (item.pctChange ?? 0) : (item.netAmount ?? 0);
  const maxGainerAbs = Math.max(...gainers.map((item) => Math.abs(metricValue(item))), 1);
  const maxLoserAbs = Math.max(...losers.map((item) => Math.abs(metricValue(item))), 1);
  const gainerTitle = viewDim === 'pct_change' ? '涨幅 Top 5' : '净流入 Top 5';
  const loserTitle = viewDim === 'pct_change' ? '跌幅 Top 5' : '净流出 Top 5';

  const fmt = (item: SectorTopBottomItem): string => {
    if (viewDim === 'pct_change') {
      if (item.pctChange == null) return '-';
      return `${item.pctChange > 0 ? '+' : ''}${item.pctChange.toFixed(2)}%`;
    }
    if (item.netAmount == null) return '-';
    const yi = item.netAmount / 1e8;
    return `${yi > 0 ? '+' : ''}${yi.toFixed(1)}亿`;
  };

  const emptyLoserText = viewDim === 'pct_change' ? '今日全行业均上涨' : '今日全行业均净流入';

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
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.1),
              }}
            >
              <Iconify icon="solar:layers-bold" width={18} sx={{ color: 'primary.main' }} />
            </Box>
            <Typography variant="subtitle1" fontWeight={700}>
              行业红黑榜
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={viewDim}
              onChange={(_, v) => v && setViewDim(v)}
            >
              <ToggleButton value="pct_change">涨跌幅</ToggleButton>
              <ToggleButton value="net_amount">净流入</ToggleButton>
            </ToggleButtonGroup>

            <Box
              component={RouterLink}
              href="/market/industry"
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
              全部
              <Iconify icon="solar:arrow-right-bold" width={14} />
            </Box>
          </Stack>
        </Stack>

        {loading ? (
          <Stack spacing={0.75}>
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={32} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : error ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {error}
          </Typography>
        ) : (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={0} sx={{ mx: -1 }}>
            {/* ── Gainers ── */}
            <Box sx={{ flex: 1, px: 1 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                  mb: 0.75,
                  pb: 0.75,
                  borderBottom: `1px solid ${varAlpha(theme.vars.palette.error.mainChannel, 0.15)}`,
                }}
              >
                <Iconify icon="solar:alt-arrow-up-bold" width={14} sx={{ color: 'error.main' }} />
                <Typography
                  variant="caption"
                  sx={{ color: 'error.main', fontWeight: 700, letterSpacing: 0.5 }}
                >
                  {gainerTitle}
                </Typography>
              </Stack>
              {gainers.map((s, i) => (
                <SectorRow
                  key={s.tsCode}
                  rank={i + 1}
                  item={s}
                  barValue={metricValue(s)}
                  maxAbsValue={maxGainerAbs}
                  displayValue={fmt(s)}
                  isPositive
                />
              ))}
            </Box>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: 'none', md: 'block' }, mx: 1 }}
            />
            <Divider sx={{ display: { xs: 'block', md: 'none' }, my: 1 }} />

            {/* ── Losers ── */}
            <Box sx={{ flex: 1, px: 1 }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{
                  mb: 0.75,
                  pb: 0.75,
                  borderBottom: `1px solid ${varAlpha(theme.vars.palette.success.mainChannel, 0.15)}`,
                }}
              >
                <Iconify
                  icon="solar:alt-arrow-down-bold"
                  width={14}
                  sx={{ color: 'success.main' }}
                />
                <Typography
                  variant="caption"
                  sx={{ color: 'success.main', fontWeight: 700, letterSpacing: 0.5 }}
                >
                  {loserTitle}
                </Typography>
              </Stack>
              {losers.length === 0 ? (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', display: 'block', py: 2, textAlign: 'center' }}
                >
                  {emptyLoserText}
                </Typography>
              ) : (
                losers.map((s, i) => (
                  <SectorRow
                    key={s.tsCode}
                    rank={i + 1}
                    item={s}
                    barValue={metricValue(s)}
                    maxAbsValue={maxLoserAbs}
                    displayValue={fmt(s)}
                    isPositive={false}
                  />
                ))
              )}
            </Box>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
