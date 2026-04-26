import type {
  HsgtTrendItem,
  SentimentResult,
  MarketBreadthResult,
  MarketMoneyFlowDetail,
} from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { fetchMoneyFlow, fetchSentiment, fetchMarketBreadth } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ── Types ──────────────────────────────────────────────────────

type MarketTone = 'bullish' | 'bearish' | 'divergent' | 'neutral';

type HeroData = {
  tone: MarketTone;
  breadth: MarketBreadthResult;
  moneyFlowYi: number | null;
  sentimentScore: number | null;
  sentimentLabel: string;
  tradeDate: string;
};

// ── Rule Engine ─────────────────────────────────────────────────

function deriveTone(breadth: MarketBreadthResult, moneyFlowYi: number | null): MarketTone {
  const total = breadth.total || 1;
  const riseRatio = (breadth.bigRise + breadth.rise) / total;
  const fallRatio = (breadth.bigFall + breadth.fall) / total;
  const capitalIn = (moneyFlowYi ?? 0) >= 0;

  if (riseRatio > 0.55 && capitalIn) return 'bullish';
  if (fallRatio > 0.55 && !capitalIn) return 'bearish';
  if (Math.abs(riseRatio - fallRatio) < 0.2) return 'neutral';
  return 'divergent';
}

function buildHeadline(
  tone: MarketTone,
  breadth: MarketBreadthResult,
  moneyFlowYi: number | null
): string {
  const total = breadth.total || 1;
  const riseRatio = (breadth.bigRise + breadth.rise) / total;

  const coreLabel =
    tone === 'bullish'
      ? riseRatio > 0.68
        ? '全面普涨，多头情绪占优'
        : '多头格局，量能配合'
      : tone === 'bearish'
        ? riseRatio < 0.25
          ? '全面普跌，空头主导'
          : '调整压力较重'
        : tone === 'divergent'
          ? '结构性分化，局部机会显现'
          : '震荡整理，方向待明';

  const addons: string[] = [];
  if (breadth.limitUp > 80) addons.push(`涨停潮 ${breadth.limitUp} 家`);
  if ((moneyFlowYi ?? 0) > 100) addons.push('主力大幅流入');
  else if ((moneyFlowYi ?? 0) < -100) addons.push('主力大幅撤离');

  return addons.length > 0 ? `${coreLabel} · ${addons.join(' · ')}` : coreLabel;
}

function getSentimentLabel(score: number): string {
  if (score < 20) return '极度恐惧';
  if (score < 40) return '偏恐惧';
  if (score < 60) return '中性';
  if (score < 80) return '偏贪婪';
  return '极度贪婪';
}

// ── Sub-components ──────────────────────────────────────────────

function StatItem({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string | React.ReactNode;
  valueColor?: string;
}) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4, mb: 0.25 }}
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        component="div"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: valueColor ?? 'text.primary',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function RiseFallBar({
  riseCount,
  fallCount,
  flatCount,
}: {
  riseCount: number;
  fallCount: number;
  flatCount: number;
}) {
  const theme = useTheme();
  const total = riseCount + fallCount + flatCount;
  if (total === 0) return null;
  const risePct = (riseCount / total) * 100;
  const flatPct = (flatCount / total) * 100;
  const fallPct = (fallCount / total) * 100;

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, maxWidth: 360 }}>
      <Typography
        variant="caption"
        sx={{
          color: 'error.main',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 44,
        }}
      >
        {riseCount.toLocaleString()} 涨
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${risePct}%`,
            bgcolor: 'error.main',
            transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <Box
          sx={{
            height: '100%',
            width: `${flatPct}%`,
            bgcolor: varAlpha(theme.vars.palette.text.disabledChannel, 0.35),
            transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
        <Box
          sx={{
            height: '100%',
            width: `${fallPct}%`,
            bgcolor: 'success.main',
            transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: 'success.main',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 44,
          textAlign: 'right',
        }}
      >
        {fallCount.toLocaleString()} 跌
      </Typography>
    </Stack>
  );
}

function ToneChip({ tone }: { tone: MarketTone }) {
  const theme = useTheme();

  const config: Record<
    MarketTone,
    { label: string; icon: string; color: string; channel: string }
  > = {
    bullish: {
      label: '做多格局',
      icon: 'solar:graph-up-bold',
      color: theme.palette.error.main,
      channel: theme.vars.palette.error.mainChannel,
    },
    bearish: {
      label: '下跌压力',
      icon: 'solar:graph-down-bold',
      color: theme.palette.success.main,
      channel: theme.vars.palette.success.mainChannel,
    },
    divergent: {
      label: '结构分化',
      icon: 'solar:shuffle-bold',
      color: theme.palette.warning.main,
      channel: theme.vars.palette.warning.mainChannel,
    },
    neutral: {
      label: '震荡整理',
      icon: 'solar:align-horizontally-bold',
      color: theme.palette.text.secondary,
      channel: theme.vars.palette.text.primaryChannel,
    },
  };

  const c = config[tone];

  return (
    <Chip
      size="small"
      label={c.label}
      icon={
        <Iconify
          icon={c.icon as any}
          width={14}
          sx={{ color: `${c.color} !important`, ml: '6px !important' }}
        />
      }
      sx={{
        height: 24,
        fontSize: 12,
        fontWeight: 700,
        color: c.color,
        bgcolor: varAlpha(c.channel, 0.1),
        border: `1px solid ${varAlpha(c.channel, 0.25)}`,
        letterSpacing: 0.3,
      }}
    />
  );
}

// ── Main Component ──────────────────────────────────────────────

type Props = {
  tradeDate?: string;
  refreshKey?: number;
  /** Shared HSGT history from parent — null/undefined means fetch not yet done or failed */
  hsgtHistory?: HsgtTrendItem[] | null;
  /** Called once after initial load so parent DatePicker can back-fill */
  onTradeDateResolved?: (date: string) => void;
};

export function MarketHeroNarrative({
  tradeDate,
  refreshKey,
  hsgtHistory,
  onTradeDateResolved,
}: Props) {
  const theme = useTheme();
  const [data, setData] = useState<HeroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Derive north money at render time from shared prop — no extra API call needed
  const todayHsgt = (hsgtHistory ?? []).slice(-1)[0] ?? null;
  const northMoneyYi = todayHsgt?.northMoney != null ? todayHsgt.northMoney / 100 : null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(false);

    Promise.allSettled([
      fetchMarketBreadth({ trade_date: tradeDate }),
      fetchMoneyFlow({ trade_date: tradeDate }),
      fetchSentiment({ trade_date: tradeDate }),
    ]).then(([breadthRes, mfRes, sentRes]) => {
      if (cancelled) return;

      const breadth = breadthRes.status === 'fulfilled' ? breadthRes.value : null;
      const mf: MarketMoneyFlowDetail | null = mfRes.status === 'fulfilled' ? mfRes.value : null;
      const sent: SentimentResult | null = sentRes.status === 'fulfilled' ? sentRes.value : null;

      if (!breadth) {
        setFetchError(true);
        setLoading(false);
        return;
      }

      // money-flow: netMfAmount is in 元 → convert to 亿元
      const moneyFlowYi = mf?.netMfAmount != null ? mf.netMfAmount / 1e8 : null;

      // sentiment score: net-breadth formula, 0–100 where 50 = neutral
      // score = ((rise−fall) / total) × 50 + 50
      // ▸ rise = bigRise + rise (all up-movers)
      // ▸ fall = bigFall + fall (all down-movers)
      // ▸ total = all A-shares (flat stocks dilute score toward 50, correct behavior)
      const riseTotal = sent != null ? (sent.bigRise ?? 0) + (sent.rise ?? 0) : 0;
      const fallTotal = sent != null ? (sent.bigFall ?? 0) + (sent.fall ?? 0) : 0;
      const sentTotal = sent?.total ?? 0;
      const sentimentScore = sentTotal > 0 ? ((riseTotal - fallTotal) / sentTotal) * 50 + 50 : null;

      const tone = deriveTone(breadth, moneyFlowYi);

      setData({
        tone,
        breadth,
        moneyFlowYi,
        sentimentScore,
        sentimentLabel: sentimentScore != null ? getSentimentLabel(sentimentScore) : '-',
        tradeDate: breadth.tradeDate ?? '',
      });
      setLoading(false);

      // Back-fill parent DatePicker only on initial auto-load (when no explicit date was passed)
      if (!tradeDate && breadth.tradeDate) {
        onTradeDateResolved?.(breadth.tradeDate);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeDate, refreshKey]);

  if (loading) {
    return <Skeleton variant="rectangular" height={148} sx={{ borderRadius: 2 }} />;
  }

  if (fetchError || !data) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          p: 2.5,
          textAlign: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body2">市场叙事数据加载失败，请点击刷新重试</Typography>
      </Box>
    );
  }

  // Compute headline at render time so it picks up latest northMoney from prop
  const headline = buildHeadline(data.tone, data.breadth, data.moneyFlowYi);

  const toneConfig: Record<MarketTone, { color: string; channel: string }> = {
    bullish: { color: theme.palette.error.main, channel: theme.vars.palette.error.mainChannel },
    bearish: {
      color: theme.palette.success.main,
      channel: theme.vars.palette.success.mainChannel,
    },
    divergent: {
      color: theme.palette.warning.main,
      channel: theme.vars.palette.warning.mainChannel,
    },
    neutral: {
      color: theme.palette.text.secondary,
      channel: theme.vars.palette.text.primaryChannel,
    },
  };

  const { color: toneColor, channel: toneChannel } = toneConfig[data.tone];

  const riseCount = data.breadth.bigRise + data.breadth.rise;
  const fallCount = data.breadth.bigFall + data.breadth.fall;
  const flatCount = data.breadth.flat;

  const mfSign = (data.moneyFlowYi ?? 0) > 0 ? '+' : '';
  const mfColor =
    (data.moneyFlowYi ?? 0) > 0 ? theme.palette.error.main : theme.palette.success.main;
  const sentColor =
    (data.sentimentScore ?? 50) > 60
      ? theme.palette.error.main
      : (data.sentimentScore ?? 50) < 40
        ? theme.palette.success.main
        : theme.palette.text.secondary;

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${varAlpha(toneChannel, 0.18)}`,
        background: `linear-gradient(135deg, ${varAlpha(toneChannel, 0.07)} 0%, transparent 55%)`,
        p: { xs: 2, sm: 2.5 },
      }}
    >
      {/* ── Row 1: Tone chip + Headline + Date ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <ToneChip tone={data.tone} />
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: toneColor, letterSpacing: 0.3, lineHeight: 1.4 }}
          >
            {headline}
          </Typography>
        </Stack>

        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              bgcolor: 'success.main',
              '@keyframes hero-pulse': {
                '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                '50%': { opacity: 0.35, transform: 'scale(0.75)' },
              },
              animation: 'hero-pulse 2.4s ease-in-out infinite',
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: 0.5 }}>
            {fmtTradeDate(data.tradeDate) || '最新交易日'}
          </Typography>
        </Stack>
      </Stack>

      {/* ── Row 2: Rise/Fall bar + limit up/down ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <RiseFallBar riseCount={riseCount} fallCount={fallCount} flatCount={flatCount} />

        <Stack direction="row" alignItems="center" spacing={2} sx={{ flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Iconify icon="solar:fire-bold" width={14} sx={{ color: 'error.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              涨停
              <Typography
                component="span"
                variant="caption"
                sx={{ color: 'error.main', fontWeight: 700, ml: 0.5 }}
              >
                {data.breadth.limitUp}
              </Typography>
            </Typography>
          </Stack>
          <Divider orientation="vertical" flexItem sx={{ height: 12, alignSelf: 'center' }} />
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Iconify icon="solar:fire-bold" width={14} sx={{ color: 'success.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              跌停
              <Typography
                component="span"
                variant="caption"
                sx={{ color: 'success.main', fontWeight: 700, ml: 0.5 }}
              >
                {data.breadth.limitDown}
              </Typography>
            </Typography>
          </Stack>
          <Divider orientation="vertical" flexItem sx={{ height: 12, alignSelf: 'center' }} />
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            共 {data.breadth.total.toLocaleString()} 家
          </Typography>
        </Stack>
      </Stack>

      {/* ── Row 3: Key numbers ── */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 0 }}
        divider={
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
        }
        sx={{
          bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.05),
          border: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.1)}`,
          borderRadius: 1.5,
          px: 2,
          py: 1.5,
          '& > *': { flex: 1, px: { sm: 2 } },
        }}
      >
        <StatItem
          label="净流入（逐笔）"
          value={
            data.moneyFlowYi != null ? `${mfSign}${data.moneyFlowYi.toFixed(2)} 亿` : '暂无数据'
          }
          valueColor={mfColor}
        />
        <StatItem
          label="北向成交额（今日）"
          value={northMoneyYi != null ? `${northMoneyYi.toFixed(2)} 亿` : '暂无数据'}
        />
        <StatItem
          label="市场情绪"
          value={
            data.sentimentScore != null
              ? `${data.sentimentScore.toFixed(0)} · ${data.sentimentLabel}`
              : '暂无数据'
          }
          valueColor={sentColor}
        />
        <StatItem
          label="大涨(≥5%) / 大跌(≤-5%)"
          value={
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 0.5,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Box component="span" sx={{ color: 'error.main' }}>
                {data.breadth.bigRise}
              </Box>
              <Box component="span" sx={{ color: 'text.disabled', fontSize: 14, mx: 0.25 }}>
                /
              </Box>
              <Box component="span" sx={{ color: 'success.main' }}>
                {data.breadth.bigFall}
              </Box>
            </Box>
          }
        />
      </Stack>
    </Box>
  );
}
