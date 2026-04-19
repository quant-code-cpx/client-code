import type { IconifyName } from 'src/components/iconify/register-icons';
import type { SentimentResult, MarketBreadthResult, IndexQuoteWithSparklineItem } from 'src/api/market';

import { varAlpha } from 'minimal-shared/utils';
import { useId, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fQianYuan } from 'src/utils/format-number';

import { fetchSentiment, fetchMarketBreadth, fetchIndexQuoteWithSparkline } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { ColoredNumber } from 'src/components/colored-number';

// ── Constants ──────────────────────────────────────────────────

/** 默认首屏展示的核心指数（6个） */
const DEFAULT_INDEX_CODES = [
  '000001.SH',
  '399001.SZ',
  '000300.SH',
  '000905.SH',
  '000852.SH',
  '399006.SZ',
];

const INDEX_NAME_MAP: Record<string, string> = {
  // 沪深宽基
  '000300.SH': '沪深300',
  '000016.SH': '上证50',
  '000903.SH': '中证100',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
  '932000.CSI': '中证2000',
  '000985.SH': '中证全指',
  // 上交所
  '000001.SH': '上证指数',
  '000010.SH': '上证180',
  '000688.SH': '科创50',
  '000698.SH': '科创100',
  // 深交所
  '399001.SZ': '深证成指',
  '399107.SZ': '深证综指',
  '399330.SZ': '深证100',
  '399006.SZ': '创业板指',
  '399673.SZ': '创业板50',
  '399005.SZ': '中小100',
  // 北交所
  '899050.BJ': '北证50',
};

// ── Sentiment Badge ─────────────────────────────────────────────

function SentimentBadge({ score }: { score: number }) {
  const theme = useTheme();

  let label: string;
  let color: string;
  if (score < 20) {
    label = '极度恐惧';
    color = theme.palette.success.dark;
  } else if (score < 40) {
    label = '偏恐惧';
    color = theme.palette.success.main;
  } else if (score < 60) {
    label = '中性';
    color = theme.palette.text.secondary;
  } else if (score < 80) {
    label = '偏贪婪';
    color = theme.palette.warning.main;
  } else {
    label = '极度贪婪';
    color = theme.palette.error.dark;
  }

  return (
    <Chip
      size="small"
      label={`情绪 ${score.toFixed(0)} · ${label}`}
      sx={{
        height: 22,
        fontSize: 12,
        fontWeight: 700,
        color,
        bgcolor: varAlpha(
          color === theme.palette.text.secondary
            ? theme.vars.palette.text.primaryChannel
            : color === theme.palette.success.main || color === theme.palette.success.dark
              ? theme.vars.palette.success.mainChannel
              : color === theme.palette.warning.main
                ? theme.vars.palette.warning.mainChannel
                : theme.vars.palette.error.mainChannel,
          0.1
        ),
        border: `1px solid ${varAlpha(
          color === theme.palette.text.secondary
            ? theme.vars.palette.text.primaryChannel
            : color === theme.palette.success.main || color === theme.palette.success.dark
              ? theme.vars.palette.success.mainChannel
              : color === theme.palette.warning.main
                ? theme.vars.palette.warning.mainChannel
                : theme.vars.palette.error.mainChannel,
          0.2
        )}`,
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

// ── SVG Sparkline ──────────────────────────────────────────────

function Sparkline({
  data,
  color,
  height = 40,
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
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${w},${height}`} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ── Metric Cell ────────────────────────────────────────────────

function MetricCell({
  icon,
  label,
  value,
  palette,
}: {
  icon: IconifyName;
  label: string;
  value: string;
  palette?: 'error' | 'success' | 'warning' | 'info';
}) {
  const color = palette ? `${palette}.main` : 'text.primary';

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 1.5, minWidth: 0 }}>
      <Iconify icon={icon} width={16} sx={{ color, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color, lineHeight: 1.2 }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', lineHeight: 1 }}>
          {label}
        </Typography>
      </Box>
    </Stack>
  );
}

// ── Rise/Fall Gauge ────────────────────────────────────────────

function RiseFallGauge({ riseCount, fallCount }: { riseCount: number; fallCount: number }) {
  const theme = useTheme();
  const total = riseCount + fallCount;
  const risePct = total > 0 ? (riseCount / total) * 100 : 50;

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 2.5, py: 1.5 }}>
      <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: 'error.main', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {riseCount}
        </Typography>
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          涨
        </Typography>
      </Stack>

      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.15),
          }}
        >
          <Box
            sx={{
              width: `${risePct}%`,
              bgcolor: 'error.main',
              borderRadius: 4,
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{
          color: 'text.disabled',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
          minWidth: 32,
          textAlign: 'center',
        }}
      >
        {risePct.toFixed(0)}%
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Typography variant="caption" sx={{ color: 'success.main' }}>
          跌
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{ color: 'success.main', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {fallCount}
        </Typography>
      </Stack>
    </Stack>
  );
}

// ── Main Component ─────────────────────────────────────────────

type Props = {
  tradeDate?: string;
};

export function MarketDailySnapshotCard({ tradeDate }: Props) {
  const theme = useTheme();
  const [breadth, setBreadth] = useState<MarketBreadthResult | null>(null);
  const [indices, setIndices] = useState<IndexQuoteWithSparklineItem[]>([]);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.allSettled([
      fetchMarketBreadth({ trade_date: tradeDate }),
      fetchIndexQuoteWithSparkline({ trade_date: tradeDate, sparkline_period: '1m' }),
      fetchSentiment({ trade_date: tradeDate }),
    ]).then(([breadthRes, indexRes, sentimentRes]) => {
      if (cancelled) return;

      if (breadthRes.status === 'fulfilled') setBreadth(breadthRes.value);
      if (indexRes.status === 'fulfilled') {
        setIndices(indexRes.value?.indices ?? []);
      }
      if (sentimentRes.status === 'fulfilled') setSentiment(sentimentRes.value);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  // Calculate sentiment score (0 = extreme fear, 100 = extreme greed)
  const riseTotal = sentiment != null ? (sentiment.bigRise ?? 0) + (sentiment.rise ?? 0) : 0;
  const fallTotal = sentiment != null ? (sentiment.bigFall ?? 0) + (sentiment.fall ?? 0) : 0;
  const sentimentTotal = riseTotal + fallTotal + (sentiment?.flat ?? 0);
  const sentimentScore = sentimentTotal > 0 ? (riseTotal / sentimentTotal) * 100 : 50;

  // Split indices: default visible vs extended
  const defaultIndices = indices.filter((i) => DEFAULT_INDEX_CODES.includes(i.tsCode));
  const extraIndices = indices.filter((i) => !DEFAULT_INDEX_CODES.includes(i.tsCode));

  if (loading) {
    return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />;
  }

  return (
    <Card
      sx={{
        overflow: 'hidden',
        border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.08)}`,
      }}
    >
      {/* ── Header ── */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2.5, pt: 2, pb: 1 }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              '@keyframes pulse-dot': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.3 },
              },
              animation: 'pulse-dot 2s ease-in-out infinite',
            }}
          />
          <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>
            市场脉搏
          </Typography>
        </Stack>

        {sentiment != null && <SentimentBadge score={sentimentScore} />}
      </Stack>

      {/* ── Index Ticker Grid ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {defaultIndices.map((item) => {
          const isPositive = (item.pctChg ?? 0) > 0;
          const isNegative = (item.pctChg ?? 0) < 0;
          const accentColor = isPositive
            ? theme.palette.error.main
            : isNegative
              ? theme.palette.success.main
              : theme.palette.text.disabled;

          return (
            <Box
              key={item.tsCode}
              component={RouterLink}
              href={`/market/index?code=${item.tsCode}`}
              sx={{
                display: 'block',
                textDecoration: 'none',
                position: 'relative',
                overflow: 'hidden',
                px: 2,
                pt: 1.5,
                pb: 5,
                transition: 'background-color 0.15s',
                '&:hover': {
                  bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.04),
                },
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}
              >
                {INDEX_NAME_MAP[item.tsCode] ?? item.name}
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1.3,
                  my: 0.25,
                  color: 'primary.main',
                }}
              >
                {item.close != null ? item.close.toFixed(2) : '-'}
              </Typography>

              <Stack direction="row" spacing={0.75} alignItems="center">
                <ColoredNumber
                  value={item.pctChg}
                  format="percent"
                  variant="caption"
                  sx={{ fontWeight: 700 }}
                />
                <ColoredNumber value={item.change} format="change" variant="caption" />
              </Stack>

              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', display: 'block', mt: 0.25, fontSize: 12 }}
              >
                {item.amount != null ? fQianYuan(item.amount) : ''}
              </Typography>

              {/* Sparkline background */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  opacity: 0.4,
                  pointerEvents: 'none',
                }}
              >
                <Sparkline
                  data={(item.sparkline ?? []).filter((v): v is number => v != null)}
                  color={accentColor}
                />
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ── Collapsible extra indices ── */}
      {extraIndices.length > 0 && (
        <>
          <Collapse in={expanded}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              {extraIndices.map((item) => {
                const isPositive = (item.pctChg ?? 0) > 0;
                const isNegative = (item.pctChg ?? 0) < 0;
                const accentColor = isPositive
                  ? theme.palette.error.main
                  : isNegative
                    ? theme.palette.success.main
                    : theme.palette.text.disabled;

                return (
                  <Box
                    key={item.tsCode}
                    component={RouterLink}
                    href={`/market/index?code=${item.tsCode}`}
                    sx={{
                      display: 'block',
                      textDecoration: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      px: 2,
                      pt: 1.5,
                      pb: 5,
                      transition: 'background-color 0.15s',
                      '&:hover': {
                        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.04),
                      },
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}
                    >
                      {INDEX_NAME_MAP[item.tsCode] ?? item.name}
                    </Typography>

                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.3,
                        my: 0.25,
                        color: 'primary.main',
                      }}
                    >
                      {item.close != null ? item.close.toFixed(2) : '-'}
                    </Typography>

                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <ColoredNumber
                        value={item.pctChg}
                        format="percent"
                        variant="caption"
                        sx={{ fontWeight: 700 }}
                      />
                      <ColoredNumber value={item.change} format="change" variant="caption" />
                    </Stack>

                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', display: 'block', mt: 0.25, fontSize: 12 }}
                    >
                      {item.amount != null ? fQianYuan(item.amount) : ''}
                    </Typography>

                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        opacity: 0.4,
                        pointerEvents: 'none',
                      }}
                    >
                      <Sparkline
                        data={(item.sparkline ?? []).filter((v): v is number => v != null)}
                        color={accentColor}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Collapse>
          <Box
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Button
              size="small"
              endIcon={
                <Iconify
                  icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                  width={16}
                />
              }
              onClick={() => setExpanded((v) => !v)}
              sx={{ my: 0.5, color: 'text.secondary', fontSize: 12 }}
            >
              {expanded ? '收起' : `展开更多 ${extraIndices.length} 个指数`}
            </Button>
          </Box>
        </>
      )}

      {/* ── Breadth Metrics ── */}
      {breadth && (
        <>
          <Stack
            direction="row"
            divider={<Divider orientation="vertical" flexItem />}
            sx={{ overflowX: 'auto', borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <MetricCell
              icon="solar:alt-arrow-up-bold"
              label="涨停"
              value={String(breadth.limitUp)}
              palette="error"
            />
            <MetricCell
              icon="solar:alt-arrow-down-bold"
              label="跌停"
              value={String(breadth.limitDown)}
              palette="success"
            />
            <MetricCell
              icon="solar:graph-up-bold"
              label="大涨≥5%"
              value={String(breadth.bigRise)}
              palette="error"
            />
            <MetricCell
              icon="solar:graph-down-bold"
              label="大跌≤-5%"
              value={String(breadth.bigFall)}
              palette="success"
            />
            <MetricCell icon="solar:layers-bold" label="平盘" value={String(breadth.flat)} />
            <MetricCell icon="solar:target-bold" label="总股数" value={String(breadth.total)} />
          </Stack>

          <RiseFallGauge
            riseCount={breadth.rise + breadth.bigRise + breadth.limitUp}
            fallCount={breadth.fall + breadth.bigFall + breadth.limitDown}
          />
        </>
      )}
    </Card>
  );
}
