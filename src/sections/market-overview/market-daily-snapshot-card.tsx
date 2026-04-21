import type { IndexQuoteWithSparklineItem } from 'src/api/market';

import { varAlpha } from 'minimal-shared/utils';
import { useId, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { fQianYuan } from 'src/utils/format-number';

import { fetchIndexQuoteWithSparkline } from 'src/api/market';

import { Iconify } from 'src/components/iconify';
import { ColoredNumber } from 'src/components/colored-number';

// ── Constants ──────────────────────────────────────────────────

/** 首屏默认展示顺序：上证、深证、创业板 排在最前 */
const DEFAULT_INDEX_CODES = [
  '000001.SH', // 上证指数
  '399001.SZ', // 深证成指
  '399006.SZ', // 创业板指
  '000300.SH', // 沪深300
  '000905.SH', // 中证500
  '000852.SH', // 中证1000
];

const INDEX_NAME_MAP: Record<string, string> = {
  '000300.SH': '沪深300',
  '000016.SH': '上证50',
  '000903.SH': '中证100',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
  '932000.CSI': '中证2000',
  '000985.SH': '中证全指',
  '000001.SH': '上证指数',
  '000010.SH': '上证180',
  '000688.SH': '科创50',
  '000698.SH': '科创100',
  '399001.SZ': '深证成指',
  '399107.SZ': '深证综指',
  '399330.SZ': '深证100',
  '399006.SZ': '创业板指',
  '399673.SZ': '创业板50',
  '399005.SZ': '中小100',
  '899050.BJ': '北证50',
};

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

// ── Index Card ─────────────────────────────────────────────────

function IndexCard({ item }: { item: IndexQuoteWithSparklineItem }) {
  const theme = useTheme();
  const isPositive = (item.pctChg ?? 0) > 0;
  const isNegative = (item.pctChg ?? 0) < 0;
  const accentColor = isPositive
    ? theme.palette.error.main
    : isNegative
      ? theme.palette.success.main
      : theme.palette.text.disabled;

  return (
    <Box
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
        '&:hover': { bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.04) },
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
}

// ── Main Component ─────────────────────────────────────────────

type Props = {
  tradeDate?: string;
};

export function MarketDailySnapshotCard({ tradeDate }: Props) {
  const theme = useTheme();
  const [indices, setIndices] = useState<IndexQuoteWithSparklineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchIndexQuoteWithSparkline({ trade_date: tradeDate, sparkline_period: '1m' })
      .then((res) => {
        if (!cancelled) setIndices(res?.indices ?? []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  // Preserve explicit ordering defined in DEFAULT_INDEX_CODES
  const defaultIndices = DEFAULT_INDEX_CODES.map((code) =>
    indices.find((i) => i.tsCode === code)
  ).filter((i): i is IndexQuoteWithSparklineItem => i != null);
  const extraIndices = indices.filter((i) => !DEFAULT_INDEX_CODES.includes(i.tsCode));

  if (loading) {
    return <Skeleton variant="rectangular" height={148} sx={{ borderRadius: 2 }} />;
  }

  return (
    <Card
      sx={{
        overflow: 'hidden',
        border: `1px solid ${varAlpha(theme.vars.palette.primary.mainChannel, 0.08)}`,
      }}
    >
      {/* ── Index Ticker Grid ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
        }}
      >
        {defaultIndices.map((item, idx) => (
          <Box
            key={item.tsCode}
            sx={{
              borderRight: idx < defaultIndices.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            <IndexCard item={item} />
          </Box>
        ))}
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
              {extraIndices.map((item, idx) => (
                <Box
                  key={item.tsCode}
                  sx={{
                    borderRight: idx < extraIndices.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                  }}
                >
                  <IndexCard item={item} />
                </Box>
              ))}
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
    </Card>
  );
}
