import type { SectorRankingItem, SectorFlowRankingItem } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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
  isPositive,
}: {
  value: number;
  maxAbs: number;
  isPositive: boolean;
}) {
  const pct = maxAbs > 0 ? Math.min(100, (Math.abs(value) / maxAbs) * 100) : 0;
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
    </Box>
  );
}

// ----------------------------------------------------------------------

export function DashboardSectorWind() {
  const theme = useTheme();
  const router = useRouter();

  const [sectors, setSectors] = useState<SectorRankingItem[]>([]);
  const [flowSectors, setFlowSectors] = useState<SectorFlowRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSectorRanking({ limit: 10, sort_by: 'pct_change' }),
      fetchSectorFlowRanking({ limit: 10, order: 'desc', sort_by: 'net_amount' }),
    ])
      .then(([ranking, flow]) => {
        setSectors(ranking.sectors ?? []);
        setFlowSectors(flow.sectors ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton variant="rounded" height={320} />;
  }

  const maxPct = Math.max(...sectors.map((s) => Math.abs(s.pctChange)), 1);
  const maxFlow = Math.max(...flowSectors.map((s) => Math.abs(s.netAmount)), 1);

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="板块风向标"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        avatar={<Iconify icon="solar:chart-bold" width={22} sx={{ color: 'primary.main' }} />}
        sx={{ pb: 1 }}
      />

      <Box sx={{ px: 3, pb: 2.5 }}>
        {/* Top movers by pctChange */}
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', fontWeight: 600, mb: 1, display: 'block', fontSize: 12 }}
        >
          涨跌幅领先
        </Typography>
        <Stack spacing={0.25} sx={{ mb: 1.5 }}>
          {sectors.map((s) => {
            const isPos = s.pctChange >= 0;
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
                  cursor: 'pointer',
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
                  {s.name}
                </Typography>
                <SectorBar value={s.pctChange} maxAbs={maxPct} isPositive={isPos} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: isPos ? 'error.main' : 'success.main',
                    minWidth: 48,
                    textAlign: 'right',
                  }}
                >
                  {isPos ? '+' : ''}
                  {s.pctChange.toFixed(2)}%
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
          资金流入领先
        </Typography>
        <Stack spacing={0.25}>
          {flowSectors.map((s) => {
            const netBillions = s.netAmount / 1e8;
            const isPos = netBillions >= 0;
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
                  cursor: 'pointer',
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
                  {s.name}
                </Typography>
                <SectorBar value={s.netAmount} maxAbs={maxFlow} isPositive={isPos} />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: isPos ? 'error.main' : 'success.main',
                    minWidth: 52,
                    textAlign: 'right',
                  }}
                >
                  {isPos ? '+' : ''}
                  {fShortenNumber(Math.abs(s.netAmount))}
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
