import type { MoneyFlowTrendItem, MarketMoneyFlowDetail } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fetchMoneyFlowTrend } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** 找出绝对值最大的档位 */
function dominantTier(data: MarketMoneyFlowDetail): string {
  const tiers = [
    { label: '超大单', val: data.elg.netAmount },
    { label: '大单', val: data.lg.netAmount },
    { label: '中单', val: data.md.netAmount },
    { label: '小单', val: data.sm.netAmount },
  ];
  const valid = tiers.filter((t) => t.val != null) as { label: string; val: number }[];
  if (valid.length === 0) return '未知';
  return valid.reduce((a, b) => (Math.abs(b.val) > Math.abs(a.val) ? b : a)).label;
}

/**
 * 计算连续方向天数（从序列末尾往前数，方向与最后一日相同的连续天数）
 * 返回如 { count: 3, isInflow: false } 表示"连续3日净流出"
 */
function calcStreak(trend: MoneyFlowTrendItem[]): { count: number; isInflow: boolean } | null {
  if (trend.length < 2) return null;
  const last = trend[trend.length - 1];
  if (last.netAmount == null) return null;
  const dir = last.netAmount > 0;
  let count = 0;
  for (let i = trend.length - 1; i >= 0; i -= 1) {
    const v = trend[i].netAmount;
    if (v == null) break;
    if (v > 0 !== dir) break;
    count += 1;
  }
  return count >= 2 ? { count, isInflow: dir } : null;
}

/**
 * 今日 vs 昨日净流入差值（元），正值表示"扩大"，负值表示"收窄/恶化"
 */
function calcDayDelta(trend: MoneyFlowTrendItem[]): number | null {
  if (trend.length < 2) return null;
  const today = trend[trend.length - 1].netAmount;
  const yesterday = trend[trend.length - 2].netAmount;
  if (today == null || yesterday == null) return null;
  return today - yesterday;
}

// ----------------------------------------------------------------------

type Props = {
  data: MarketMoneyFlowDetail | null;
  loading?: boolean;
  /** 与父页面同步日期，用于拉取趋势数据 */
  tradeDate?: string;
};

/**
 * PulseHeadline — 页面顶部资金状态栏。
 * 展示卡片里没有的增量信号：连续N日方向 + 较前日变化。
 */
export function PulseHeadline({ data, loading, tradeDate }: Props) {
  const theme = useTheme();
  const [trend, setTrend] = useState<MoneyFlowTrendItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchMoneyFlowTrend({ trade_date: tradeDate, days: 7 })
      .then((res) => {
        if (!cancelled) setTrend(res?.data ?? []);
      })
      .catch(() => {
        // 趋势辅助信息，静默失败不阻断主视图
      });
    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  if (loading || data == null) {
    return <Skeleton variant="rectangular" height={36} sx={{ mt: 1.5, borderRadius: 1 }} />;
  }

  const net = data.netMfAmount;
  const isInflow = net != null && net > 0;
  const accentColor = isInflow ? theme.palette.error.main : theme.palette.success.main;
  const accentChannel = isInflow
    ? theme.vars.palette.error.mainChannel
    : theme.vars.palette.success.mainChannel;

  const icon = isInflow ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold';

  // 增量信号
  const streak = calcStreak(trend);
  const delta = calcDayDelta(trend);
  const deltaIsExpansion = delta != null && ((isInflow && delta > 0) || (!isInflow && delta < 0));
  const deltaLabel =
    delta != null
      ? `较昨日${deltaIsExpansion ? '扩大' : '收窄'} ${Math.abs(delta / 1e8).toFixed(2)}亿`
      : null;

  const dominant = dominantTier(data);

  return (
    <Box
      sx={{
        mt: 1.5,
        px: 2,
        py: 0.875,
        borderRadius: 1,
        borderLeft: '3px solid',
        borderColor: accentColor,
        bgcolor: varAlpha(accentChannel, 0.06),
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: { xs: 1, sm: 1.5 },
        minHeight: 36,
      }}
    >
      {/* 脉搏动画点 */}
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: accentColor,
          flexShrink: 0,
          '@keyframes kf-beat': {
            '0%, 100%': { opacity: 1, transform: 'scale(1)' },
            '50%': { opacity: 0.4, transform: 'scale(0.72)' },
          },
          animation: 'kf-beat 1.6s ease-in-out infinite',
        }}
      />

      {/* 连续方向 chip（增量信号 #1） */}
      {streak != null && (
        <Chip
          size="small"
          label={`连续 ${streak.count} 日${streak.isInflow ? '净流入' : '净流出'}`}
          sx={{
            height: 20,
            fontSize: 12,
            fontWeight: 600,
            bgcolor: varAlpha(accentChannel, 0.12),
            color: accentColor,
            border: '1px solid',
            borderColor: varAlpha(accentChannel, 0.3),
          }}
        />
      )}

      <Divider orientation="vertical" flexItem />

      {/* 较前日变化（增量信号 #2） */}
      {deltaLabel != null && (
        <>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify
              icon={deltaIsExpansion ? icon : 'solar:alt-arrow-down-bold'}
              width={14}
              sx={{ color: deltaIsExpansion ? accentColor : 'text.secondary' }}
            />
            <Typography
              variant="body2"
              sx={{ color: deltaIsExpansion ? accentColor : 'text.secondary' }}
            >
              {deltaLabel}
            </Typography>
          </Stack>
          <Divider orientation="vertical" flexItem />
        </>
      )}

      {/* 主导档位 */}
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        <Typography
          component="span"
          variant="body2"
          fontWeight={600}
          sx={{ color: 'text.primary' }}
        >
          {dominant}
        </Typography>
        {' 主导'}
      </Typography>
    </Box>
  );
}
