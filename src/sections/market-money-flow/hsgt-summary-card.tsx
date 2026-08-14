import type { HsgtFlowHistoryItem } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fmtTradeDate } from 'src/utils/format-time';

import { fetchHsgtFlow } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** 百万元 → 亿元（tushare north_money 单位为百万元） */
function formatYi(millionYuan: number | null): string {
  if (millionYuan == null) return '—';
  return `${millionYuan > 0 ? '+' : ''}${(millionYuan / 100).toFixed(2)}亿`;
}

function flowColor(value: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (value == null) return 'text.secondary';
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

// ----------------------------------------------------------------------

type ChannelSplitBarProps = {
  aVal: number | null;
  bVal: number | null;
  aLabel: string;
  bLabel: string;
  aColor: string;
  bColor: string;
};

function ChannelSplitBar({ aVal, bVal, aLabel, bLabel, aColor, bColor }: ChannelSplitBarProps) {
  if (aVal == null || bVal == null) return null;

  const va = Math.abs(aVal);
  const vb = Math.abs(bVal);
  const total = va + vb;
  if (total === 0) return null;
  const pctA = Math.round((va / total) * 100);
  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', height: 5, borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ width: `${pctA}%`, bgcolor: aColor }} />
        <Box sx={{ width: `${100 - pctA}%`, bgcolor: bColor }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
          {aLabel} {pctA}%
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
          {bLabel} {100 - pctA}%
        </Typography>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

type SubItemProps = {
  label: string;
  value: number | null;
};

function SubItem({ label, value }: SubItemProps) {
  const color = flowColor(value);
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.4 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
        {label}
      </Typography>
      <Typography variant="caption" fontWeight="fontWeightSemiBold" sx={{ color, fontSize: 12 }}>
        {formatYi(value)}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function HsgtSummaryCard({ tradeDate }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<HsgtFlowHistoryItem | null>(null);
  const [resolvedDate, setResolvedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHsgtFlow({ trade_date: tradeDate, days: 1 })
      .then((res) => {
        if (!cancelled) {
          setData(res?.history?.[0] ?? null);
          setResolvedDate(res?.tradeDate ?? null);
        }
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
  }, [tradeDate]);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', pb: '16px !important' }}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">沪深港通资金</Typography>
          {resolvedDate && (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              {fmtTradeDate(resolvedDate)}
            </Typography>
          )}
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1} sx={{ flex: 1 }}>
            <Skeleton variant="text" width="55%" height={28} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={5} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={1} sx={{ my: 1 }} />
            <Skeleton variant="text" width="55%" height={28} />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="rectangular" height={5} sx={{ borderRadius: 1 }} />
            <Skeleton variant="text" width="80%" />
          </Stack>
        ) : !data ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            暂无数据
          </Typography>
        ) : (
          <Box sx={{ flex: 1 }}>
            {/* ── 北向资金 ── */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.06),
                mb: 1.5,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
                <Iconify
                  icon="solar:alt-arrow-up-bold"
                  width={14}
                  sx={{ color: 'error.main', flexShrink: 0 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                  北向资金（合计）
                </Typography>
              </Stack>

              <Typography
                variant="h5"
                fontWeight="fontWeightBold"
                sx={{ color: flowColor(data.northMoney), lineHeight: 1.3 }}
              >
                {formatYi(data.northMoney)}
              </Typography>

              <Box sx={{ mt: 1 }}>
                <SubItem label="沪股通" value={data.hgt} />
                <SubItem label="深股通" value={data.sgt} />
              </Box>

              <ChannelSplitBar
                aVal={data.hgt}
                bVal={data.sgt}
                aLabel="沪股通"
                bLabel="深股通"
                aColor={theme.palette.error.main}
                bColor={theme.palette.error.light}
              />
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* ── 南向资金 ── */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.06),
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
                <Iconify
                  icon="solar:alt-arrow-down-bold"
                  width={14}
                  sx={{ color: 'info.main', flexShrink: 0 }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 12 }}>
                  南向资金（合计）
                </Typography>
              </Stack>

              <Typography
                variant="h5"
                fontWeight="fontWeightBold"
                sx={{ color: flowColor(data.southMoney), lineHeight: 1.3 }}
              >
                {formatYi(data.southMoney)}
              </Typography>

              <Box sx={{ mt: 1 }}>
                <SubItem label="港股通（沪）" value={data.ggtSs} />
                <SubItem label="港股通（深）" value={data.ggtSz} />
              </Box>

              <ChannelSplitBar
                aVal={data.ggtSs}
                bVal={data.ggtSz}
                aLabel="港股通(沪)"
                bLabel="港股通(深)"
                aColor={theme.palette.info.main}
                bColor={theme.palette.info.light}
              />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
