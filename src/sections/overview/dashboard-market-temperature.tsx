import type { SentimentResult, VolumeOverviewItem } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { fetchSentiment, fetchVolumeOverview } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function SentimentGauge({
  rise,
  flat,
  fall,
  total,
}: {
  rise: number;
  flat: number;
  fall: number;
  total: number;
}) {
  const theme = useTheme();
  const risePct = total > 0 ? (rise / total) * 100 : 0;
  const flatPct = total > 0 ? (flat / total) * 100 : 0;
  const fallPct = total > 0 ? (fall / total) * 100 : 0;

  // Net sentiment: 0~100 scale where 50 is neutral
  const sentiment = total > 0 ? ((rise - fall) / total) * 50 + 50 : 50;
  const sentimentLabel = sentiment >= 65 ? '偏多' : sentiment <= 35 ? '偏空' : '中性';
  const sentimentColor =
    sentiment >= 65
      ? theme.palette.error.main
      : sentiment <= 35
        ? theme.palette.success.main
        : theme.palette.warning.main;

  return (
    <Box>
      {/* Sentiment score */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `conic-gradient(${sentimentColor} ${sentiment * 3.6}deg, ${varAlpha(theme.vars.palette.text.disabledChannel, 0.12)} 0deg)`,
          }}
        >
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, fontSize: 13, color: sentimentColor }}
            >
              {Math.round(sentiment)}
            </Typography>
          </Box>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color: sentimentColor, fontWeight: 700 }}>
            {sentimentLabel}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            情绪指数
          </Typography>
        </Box>
      </Stack>

      {/* Breadth bar */}
      <Box
        sx={{
          display: 'flex',
          height: 8,
          borderRadius: 1,
          overflow: 'hidden',
          mb: 1.5,
        }}
      >
        <Box sx={{ width: `${risePct}%`, bgcolor: 'error.main', transition: 'width 0.6s' }} />
        <Box
          sx={{
            width: `${flatPct}%`,
            bgcolor: varAlpha(theme.vars.palette.text.disabledChannel, 0.3),
            transition: 'width 0.6s',
          }}
        />
        <Box sx={{ width: `${fallPct}%`, bgcolor: 'success.main', transition: 'width 0.6s' }} />
      </Box>

      {/* Counts */}
      <Stack direction="row" justifyContent="space-between">
        <Stack alignItems="center" spacing={0.25}>
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, fontSize: 13 }}>
            {fNumber(rise)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
            上涨
          </Typography>
        </Stack>
        <Stack alignItems="center" spacing={0.25}>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontWeight: 700, fontSize: 13 }}
          >
            {fNumber(flat)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
            平盘
          </Typography>
        </Stack>
        <Stack alignItems="center" spacing={0.25}>
          <Typography
            variant="caption"
            sx={{ color: 'success.main', fontWeight: 700, fontSize: 13 }}
          >
            {fNumber(fall)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>
            下跌
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function DashboardMarketTemperature() {
  const theme = useTheme();
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [volume, setVolume] = useState<VolumeOverviewItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSentiment(), fetchVolumeOverview({ days: 10 })])
      .then(([s, v]) => {
        setSentiment(s);
        setVolume(v.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton variant="rounded" height={260} />;
  }

  if (!sentiment) return null;

  const rise = sentiment.bigRise + sentiment.rise;
  const flat = sentiment.flat;
  const fall = sentiment.bigFall + sentiment.fall;
  const total = sentiment.total || rise + flat + fall;

  // Volume comparison: latest vs 5-day avg
  const volItems = volume ?? [];
  const latestVol = volItems.length > 0 ? volItems[volItems.length - 1].totalAmount : 0;
  const avgVol =
    volItems.length > 1
      ? volItems.slice(0, -1).reduce((sum, v) => sum + v.totalAmount, 0) / (volItems.length - 1)
      : latestVol;
  const volChange = avgVol > 0 ? ((latestVol - avgVol) / avgVol) * 100 : 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="市场温度"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        avatar={<Iconify icon="solar:fire-bold" width={22} sx={{ color: 'warning.main' }} />}
        sx={{ pb: 1 }}
      />

      <Box sx={{ px: 3, pb: 2.5 }}>
        <SentimentGauge rise={rise} flat={flat} fall={fall} total={total} />

        {/* Volume indicator */}
        <Box
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04),
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              全A成交
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {fShortenNumber(latestVol * 1e8)}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: volChange >= 0 ? 'error.main' : 'success.main',
                  fontWeight: 600,
                  fontSize: 10,
                }}
              >
                {volChange >= 0 ? '↑' : '↓'}
                {Math.abs(volChange).toFixed(1)}%
              </Typography>
            </Stack>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (latestVol / (avgVol * 2)) * 100)}
            sx={{
              mt: 1,
              height: 4,
              borderRadius: 1,
              bgcolor: varAlpha(theme.vars.palette.text.disabledChannel, 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
                bgcolor: latestVol > avgVol ? 'error.main' : 'text.secondary',
              },
            }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 9 }}>
              0
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 9 }}>
              近{volItems.length - 1}日均量2x
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Card>
  );
}
