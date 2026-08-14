import type { SectorRankingItem, SectorFlowRankingItem } from 'src/api/market';

import { varAlpha } from 'minimal-shared/utils';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { useRouter } from 'src/routes/hooks';

import { fShortenNumber } from 'src/utils/format-number';

import { fetchSectorRanking, fetchSectorFlowRanking } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function SectorBar({
  value,
  maxAbs,
}: {
  value: number | null;
  maxAbs: number;
}) {
  const pct =
    value == null ? null : maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
  const isPositive = value != null && value > 0;
  return (
    <Box
      sx={{
        width: 60,
        height: 6,
        borderRadius: 1,
        bgcolor: 'action.hover',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {value != null && value !== 0 && pct != null && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            [isPositive ? 'left' : 'right']: 0,
            height: '100%',
            width: `${pct}%`,
            borderRadius: 1,
            bgcolor: isPositive ? 'error.main' : 'success.main',
            transition: 'width 0.4s ease-out',
          }}
        />
      )}
    </Box>
  );
}

function maxKnownAbs(values: Array<number | null>): number {
  const knownValues = values.filter((value): value is number => value != null);
  return Math.max(...knownValues.map((value) => Math.abs(value)), 1);
}

// ----------------------------------------------------------------------

export function DashboardSectorWind({ refreshKey }: { refreshKey?: number }) {
  const theme = useTheme();
  const router = useRouter();

  const [sectors, setSectors] = useState<SectorRankingItem[]>([]);
  const [flowSectors, setFlowSectors] = useState<SectorFlowRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const fetchData = useCallback(() => {
    setLoading(true);
    setErrors([]);
    return Promise.allSettled([
      fetchSectorRanking({ limit: 10, sort_by: 'pct_change' }),
      fetchSectorFlowRanking({ limit: 10, order: 'desc', sort_by: 'net_amount' }),
    ])
      .then(([rankingResult, flowResult]) => {
        const nextErrors: string[] = [];
        if (rankingResult.status === 'fulfilled') {
          setSectors(rankingResult.value?.sectors ?? []);
        } else {
          nextErrors.push(
            rankingResult.reason instanceof Error && rankingResult.reason.message
              ? rankingResult.reason.message
              : '板块涨跌数据加载失败'
          );
        }
        if (flowResult.status === 'fulfilled') {
          setFlowSectors(
            flowResult.value && 'sectors' in flowResult.value
              ? (flowResult.value.sectors ?? [])
              : []
          );
        } else {
          nextErrors.push(
            flowResult.reason instanceof Error && flowResult.reason.message
              ? flowResult.reason.message
              : '板块资金数据加载失败'
          );
        }
        setErrors(nextErrors);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData, refreshKey]);

  if (loading) {
    return <Skeleton variant="rounded" height={320} />;
  }

  const maxPct = maxKnownAbs(sectors.map((sector) => sector.pctChange));
  const maxFlow = maxKnownAbs(flowSectors.map((sector) => sector.netAmount));

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="板块风向标"
        slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }}
        avatar={<Iconify icon="solar:chart-bold" width={22} sx={{ color: 'primary.main' }} />}
        sx={{ pb: 1 }}
      />

      <Box sx={{ px: 3, pb: 2.5 }}>
        {errors.length > 0 && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={() => void fetchData()}>
                重试
              </Button>
            }
            sx={{ mb: 1.5 }}
          >
            {errors.join('；')}
          </Alert>
        )}

        {/* Top movers by pctChange */}
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', fontWeight: 600, mb: 1, display: 'block', fontSize: 12 }}
        >
          涨跌幅领先
        </Typography>
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          {sectors.map((s) => {
            const isPos = s.pctChange != null && s.pctChange > 0;
            const isNeg = s.pctChange != null && s.pctChange < 0;
            return (
              <Stack
                key={s.tsCode}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  transition: 'background-color 0.15s',
                  '&:hover': {
                    bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04),
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: 13,
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.name ?? s.tsCode}
                </Typography>
                <SectorBar value={s.pctChange} maxAbs={maxPct} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color:
                      s.pctChange == null
                        ? 'text.secondary'
                        : isPos
                          ? 'error.main'
                          : isNeg
                            ? 'success.main'
                            : 'text.secondary',
                    minWidth: 48,
                    textAlign: 'right',
                  }}
                >
                  {s.pctChange == null ? '—' : `${isPos ? '+' : ''}${s.pctChange.toFixed(2)}%`}
                </Typography>
              </Stack>
            );
          })}
        </Stack>

        <Divider sx={{ mb: 1 }} />

        {/* Top movers by capital flow */}
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', fontWeight: 600, mb: 0.75, display: 'block', fontSize: 12 }}
        >
          主力净流入领先
        </Typography>
        <Stack spacing={0.25}>
          {flowSectors.map((s) => {
            const isPos = s.netAmount != null && s.netAmount > 0;
            const isNeg = s.netAmount != null && s.netAmount < 0;
            return (
              <Stack
                key={s.tsCode}
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  transition: 'background-color 0.15s',
                  '&:hover': {
                    bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04),
                  },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    fontSize: 13,
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.name ?? s.tsCode}
                </Typography>
                <SectorBar value={s.netAmount} maxAbs={maxFlow} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color:
                      s.netAmount == null
                        ? 'text.secondary'
                        : isPos
                          ? 'error.main'
                          : isNeg
                            ? 'success.main'
                            : 'text.secondary',
                    minWidth: 52,
                    textAlign: 'right',
                  }}
                >
                  {s.netAmount == null
                    ? '—'
                    : `${isPos ? '+' : ''}${fShortenNumber(Math.abs(s.netAmount))}`}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>

      <Box sx={{ px: 2, pb: 1.5, textAlign: 'center' }}>
        <Button
          size="small"
          variant="text"
          onClick={() => router.push('/market/industry-rotation')}
        >
          查看更多 →
        </Button>
      </Box>
    </Card>
  );
}
