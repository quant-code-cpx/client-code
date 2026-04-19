import type { IconifyProps } from 'src/components/iconify';
import type { MarketMoneyFlowDetail } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fPctChg } from 'src/utils/format-number';

import { fetchMoneyFlow } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** 元 → 亿元，保留 2 位小数 */
function toYi(yuan: number | null): string {
  if (yuan == null) return '-';
  return (yuan / 100000000).toFixed(2);
}

function flowColor(value: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (value == null) return 'text.secondary';
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

function flowPalette(value: number | null): 'error' | 'success' | 'grey' {
  if (value == null) return 'grey';
  if (value > 0) return 'error';
  if (value < 0) return 'success';
  return 'grey';
}

// ----------------------------------------------------------------------

type MetricCardProps = {
  label: string;
  amount: number | null;
  rate: number | null;
  icon: IconifyProps['icon'];
  hero?: boolean;
};

function MetricCard({ label, amount, rate, icon, hero }: MetricCardProps) {
  const theme = useTheme();
  const color = flowColor(amount);
  const palette = flowPalette(amount);
  const bgChannel =
    palette === 'grey'
      ? theme.vars.palette.text.secondaryChannel
      : theme.vars.palette[palette].mainChannel;

  return (
    <Box
      sx={{
        p: hero ? 2.5 : 2,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: varAlpha(bgChannel, 0.06),
        border: `1px solid`,
        borderColor: varAlpha(bgChannel, 0.12),
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          bgcolor: varAlpha(bgChannel, 0.1),
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 16px 0 ${varAlpha(bgChannel, 0.16)}`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Iconify icon={icon} width={18} sx={{ color, opacity: 0.72 }} />
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 'fontWeightMedium' }}
        >
          {label}
        </Typography>
      </Stack>

      <Typography
        variant={hero ? 'h4' : 'h6'}
        fontWeight="fontWeightBold"
        sx={{ color, lineHeight: 1.2, mb: 0.5 }}
      >
        {amount != null && amount > 0 ? '+' : ''}
        {toYi(amount)}
        <Typography
          component="span"
          variant={hero ? 'body1' : 'body2'}
          sx={{ color, ml: 0.5, fontWeight: 'fontWeightMedium' }}
        >
          亿
        </Typography>
      </Typography>

      <Typography variant="caption" sx={{ color, opacity: 0.8 }}>
        {fPctChg(rate)}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function CapitalFlowSummaryCard({ tradeDate }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<MarketMoneyFlowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMoneyFlow({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载大盘资金流数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Card
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.02)} 0%, ${varAlpha(theme.vars.palette.background.neutralChannel, 0.02)} 100%)`,
      }}
    >
      {loading || !data ? (
        <Grid container spacing={2}>
          {Array.from({ length: 5 }, (_, i) => i).map((k) => (
            <Grid key={k} size={{ xs: 6, sm: 4, md: k === 0 ? 4 : 2 }}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard
                label="逐笔主力净流入"
                amount={data.netMfAmount}
                rate={
                  data.netMfAmount != null && data.totalAmount != null && data.totalAmount !== 0
                    ? (data.netMfAmount / data.totalAmount) * 100
                    : null
                }
                icon="solar:wallet-bold"
                hero
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="超大单"
                amount={data.elg.netAmount}
                rate={data.elg.netRate}
                icon="solar:star-bold"
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="大单"
                amount={data.lg.netAmount}
                rate={data.lg.netRate}
                icon="solar:graph-up-bold"
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="中单"
                amount={data.md.netAmount}
                rate={data.md.netRate}
                icon="solar:filter-bold"
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="小单"
                amount={data.sm.netAmount}
                rate={data.sm.netRate}
                icon="solar:alt-arrow-down-bold"
              />
            </Grid>
          </Grid>

          {/* 沪深指数行 */}
          <Stack
            direction="row"
            spacing={3}
            justifyContent="center"
            sx={{
              mt: 2,
              pt: 2,
              borderTop: `1px dashed`,
              borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.2),
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                沪市
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{ color: flowColor(data.pctChangeSh), fontWeight: 'fontWeightBold' }}
              >
                {data.closeSh?.toFixed(2) ?? '-'}
              </Typography>
              <Typography variant="caption" sx={{ color: flowColor(data.pctChangeSh) }}>
                {fPctChg(data.pctChangeSh)}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                深市
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{ color: flowColor(data.pctChangeSz), fontWeight: 'fontWeightBold' }}
              >
                {data.closeSz?.toFixed(2) ?? '-'}
              </Typography>
              <Typography variant="caption" sx={{ color: flowColor(data.pctChangeSz) }}>
                {fPctChg(data.pctChangeSz)}
              </Typography>
            </Stack>
          </Stack>
        </>
      )}
    </Card>
  );
}
