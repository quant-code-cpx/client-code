import type { SentimentResult } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchSentiment } from 'src/api/market';

// ── Sentiment Gauge ────────────────────────────────────────────

function SentimentGauge({ score }: { score: number }) {
  const theme = useTheme();

  let label: string;
  let labelColor: string;
  if (score < 20) {
    label = '极度恐惧';
    labelColor = theme.palette.success.dark;
  } else if (score < 40) {
    label = '偏恐惧';
    labelColor = theme.palette.success.main;
  } else if (score < 60) {
    label = '中性';
    labelColor = theme.palette.text.secondary;
  } else if (score < 80) {
    label = '偏贪婪';
    labelColor = theme.palette.error.main;
  } else {
    label = '极度贪婪';
    labelColor = theme.palette.error.dark;
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Score display */}
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="center"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Typography
          variant="h3"
          sx={{ fontWeight: 700, color: labelColor, fontVariantNumeric: 'tabular-nums' }}
        >
          {score.toFixed(0)}
        </Typography>
        <Typography variant="body2" sx={{ color: labelColor, fontWeight: 600 }}>
          {label}
        </Typography>
      </Stack>

      {/* Gauge bar */}
      <Box sx={{ px: 1 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 600 }}>
            恐惧
          </Typography>
          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600 }}>
            贪婪
          </Typography>
        </Stack>

        <Box
          sx={{
            height: 12,
            borderRadius: 6,
            background: `linear-gradient(90deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 25%, ${theme.palette.grey[500]} 50%, ${theme.palette.error.main} 75%, ${theme.palette.error.dark} 100%)`,
            position: 'relative',
          }}
        >
          {/* Needle indicator */}
          <Box
            sx={{
              position: 'absolute',
              left: `${score}%`,
              top: -4,
              transform: 'translateX(-50%)',
              width: 4,
              height: 20,
              borderRadius: 2,
              bgcolor: 'common.white',
              border: '2px solid',
              borderColor: 'text.primary',
              transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

// ── Segment Bar ────────────────────────────────────────────────

function SentimentSegmentBar({ data }: { data: SentimentResult }) {
  const theme = useTheme();
  const total = data.total || 1;

  const segments = [
    { label: '涨≥5%', count: data.bigRise ?? 0, color: theme.palette.error.dark },
    { label: '涨0~5%', count: data.rise ?? 0, color: theme.palette.error.main },
    { label: '平盘', count: data.flat ?? 0, color: theme.palette.grey[500] },
    { label: '跌0~5%', count: data.fall ?? 0, color: theme.palette.success.main },
    { label: '跌≥5%', count: data.bigFall ?? 0, color: theme.palette.success.dark },
  ].map((seg) => ({ ...seg, pct: (seg.count / total) * 100 }));

  return (
    <Box>
      {/* Proportional color bar */}
      <Box sx={{ display: 'flex', height: 28, borderRadius: 1, overflow: 'hidden', mb: 1 }}>
        {segments.map((seg) => (
          <Box
            key={seg.label}
            sx={{
              width: `${seg.pct}%`,
              bgcolor: seg.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: seg.pct > 3 ? 20 : 0,
              transition: 'width 0.6s ease',
            }}
          >
            {seg.pct > 5 && (
              <Typography
                variant="caption"
                sx={{ color: '#fff', fontWeight: 700, fontSize: 12 }}
              >
                {seg.count}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      {/* Labels below */}
      <Stack direction="row" justifyContent="space-between">
        {segments.map((seg) => (
          <Box key={seg.label} sx={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: seg.color,
                fontWeight: 700,
                display: 'block',
                fontSize: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {seg.count}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', display: 'block', fontSize: 12 }}
            >
              {seg.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────

type Props = {
  tradeDate?: string;
};

export function MarketSentimentCard({ tradeDate }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSentiment({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载市场情绪失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  // Calculate sentiment score (0 = extreme fear, 100 = extreme greed)
  const riseTotal = data != null ? (data.bigRise ?? 0) + (data.rise ?? 0) : 0;
  const fallTotal = data != null ? (data.bigFall ?? 0) + (data.fall ?? 0) : 0;
  const total = riseTotal + fallTotal + (data?.flat ?? 0);
  const sentimentScore = total > 0 ? (riseTotal / total) * 100 : 50;

  return (
    <Card
      sx={{
        border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.08)}`,
      }}
    >
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          市场情绪
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            <Skeleton variant="text" width={80} height={48} sx={{ mx: 'auto' }} />
            <Skeleton variant="rectangular" height={12} sx={{ borderRadius: 6, mb: 3, mt: 2 }} />
            <Skeleton variant="rectangular" height={28} sx={{ borderRadius: 1 }} />
          </>
        ) : data != null ? (
          <>
            <SentimentGauge score={sentimentScore} />
            <SentimentSegmentBar data={data} />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
