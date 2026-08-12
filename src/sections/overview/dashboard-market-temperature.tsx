import type { SentimentResult, VolumeOverviewItem, ChangeDistributionResult } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import LinearProgress from '@mui/material/LinearProgress';

import { fNumber, fShortenNumber } from 'src/utils/format-number';

import { fetchSentiment, fetchVolumeOverview, fetchChangeDistribution } from 'src/api/market';

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
  const sentimentLabel =
    sentiment >= 80
      ? '极度贪婪'
      : sentiment >= 60
        ? '偏贪婪'
        : sentiment >= 40
          ? '中性'
          : sentiment >= 20
            ? '偏恐惧'
            : '极度恐惧';
  const sentimentColor =
    sentiment >= 60
      ? theme.palette.error.main
      : sentiment <= 40
        ? theme.palette.success.main
        : theme.palette.warning.main;

  return (
    <Box>
      {/* Sentiment score */}
      <Box sx={{ textAlign: 'center', mb: 2.5 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
            background: `conic-gradient(${sentimentColor} ${sentiment * 3.6}deg, ${varAlpha(theme.vars.palette.text.disabledChannel, 0.12)} 0deg)`,
          }}
        >
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, color: sentimentColor, lineHeight: 1 }}>
              {Math.round(sentiment)}
            </Typography>
          </Box>
        </Box>
        <Typography variant="subtitle1" sx={{ color: sentimentColor, fontWeight: 700 }}>
          {sentimentLabel}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          情绪指数
        </Typography>
      </Box>

      {/* Breadth bar */}
      <Box
        sx={{
          display: 'flex',
          height: 10,
          borderRadius: 1,
          overflow: 'hidden',
          mb: 2,
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
        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 700 }}>
            {fNumber(rise)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
            上涨
          </Typography>
        </Stack>
        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {fNumber(flat)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
            平盘
          </Typography>
        </Stack>
        <Stack alignItems="center" spacing={0.5}>
          <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>
            {fNumber(fall)}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
            下跌
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

// ----------------------------------------------------------------------

type DashboardMarketTemperatureProps = {
  /** Called once with the latest trade date after sentiment data loads */
  onTradeDateResolved?: (date: string) => void;
  refreshKey?: number;
};

export function DashboardMarketTemperature({
  onTradeDateResolved,
  refreshKey,
}: DashboardMarketTemperatureProps) {
  const theme = useTheme();
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [volume, setVolume] = useState<VolumeOverviewItem[] | null>(null);
  const [changeData, setChangeData] = useState<ChangeDistributionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      fetchSentiment(),
      fetchVolumeOverview({ days: 10 }),
      fetchChangeDistribution(),
    ])
      .then(([sentimentResult, volumeResult, changeResult]) => {
        const nextSentiment = sentimentResult.status === 'fulfilled' ? sentimentResult.value : null;
        setSentiment(nextSentiment);
        setVolume(volumeResult.status === 'fulfilled' ? (volumeResult.value.data ?? []) : []);
        setChangeData(changeResult.status === 'fulfilled' ? changeResult.value : null);
        if (nextSentiment?.tradeDate) onTradeDateResolved?.(nextSentiment.tradeDate);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (loading) {
    return <Skeleton variant="rounded" height={320} />;
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
  const volumeAvgDays = Math.max(0, volItems.length - 1);
  const volumeProgress = avgVol > 0 ? Math.min(100, (latestVol / (avgVol * 2)) * 100) : 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="市场温度"
        slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }}
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
                  fontSize: 12,
                }}
              >
                {volChange >= 0 ? '↑' : '↓'}
                {Math.abs(volChange).toFixed(1)}%
              </Typography>
            </Stack>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={volumeProgress}
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
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-end"
            sx={{ mt: 0.5 }}
          >
            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
              0
            </Typography>
            <Stack alignItems="flex-end" spacing={0}>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: 12, lineHeight: 1.3 }}
              >
                近{volumeAvgDays}日均量×2
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: 12, lineHeight: 1.3 }}
              >
                ≈ {fShortenNumber(avgVol * 2 * 1e8)}
              </Typography>
            </Stack>
          </Stack>
        </Box>

        {/* 涨跌停统计 */}
        {changeData && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 1.5,
              bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04),
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, mb: 1, display: 'block' }}
            >
              涨跌停统计
            </Typography>
            <Stack direction="row" justifyContent="space-around" alignItems="center">
              <Stack alignItems="center" spacing={0.5}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: 'error.main', lineHeight: 1 }}
                >
                  {fNumber(changeData.limitUp)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
                  涨停
                </Typography>
              </Stack>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <Stack alignItems="center" spacing={0.5}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, color: 'success.main', lineHeight: 1 }}
                >
                  {fNumber(changeData.limitDown)}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 12 }}>
                  跌停
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}
      </Box>
    </Card>
  );
}
