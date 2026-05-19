import type { LimitListItem, LimitSummaryDay } from 'src/api/alert';

import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fNumber, fPercent } from 'src/utils/format-number';

import { getStreakDays, LIMIT_GLOSSARY } from './utils/limit-glossary';

// ----------------------------------------------------------------------

type Props = {
  items: LimitListItem[];
  /** 近 N 日（首位是今日，越往后越久远） */
  summary?: LimitSummaryDay[] | null;
  /** 最高板锚点回调 */
  onMaxStreakClick?: () => void;
};

type KpiSpec = {
  key: string;
  label: string;
  value: string;
  accent: 'error' | 'success' | 'warning' | 'info' | 'primary';
  delta?: number | null;
  tooltip?: string;
  onClick?: () => void;
};

// 简易 SVG 折线
function MiniSparkline({
  data,
  color,
  width = 96,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data
    .map(
      (v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`
    )
    .join(' ');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AlertLimitTopSummary({ items, summary, onMaxStreakClick }: Props) {
  const theme = useTheme();
  const summaryList = useMemo<LimitSummaryDay[]>(
    () => (Array.isArray(summary) ? summary : []),
    [summary]
  );

  const kpis = useMemo<KpiSpec[]>(() => {
    const limitUp = items.filter((it) => it.limitType === 'UP');
    const limitDown = items.filter((it) => it.limitType === 'DOWN');
    const streak2 = items.filter((it) => getStreakDays(it) >= 2);
    const maxStreak = items.reduce((m, it) => Math.max(m, getStreakDays(it)), 0);

    const today = summaryList[0];
    const sealRate = today?.sealRate;
    const promoteRate = today?.promoteRate;

    const avg5UpCount =
      summaryList.length > 0
        ? summaryList.reduce((s, d) => s + d.limitUp, 0) / summaryList.length
        : null;

    return [
      {
        key: 'up',
        label: '今日涨停',
        value: fNumber(limitUp.length),
        accent: 'error',
        delta:
          avg5UpCount != null && avg5UpCount > 0
            ? (limitUp.length - avg5UpCount) / avg5UpCount
            : null,
      },
      {
        key: 'down',
        label: '今日跌停',
        value: fNumber(limitDown.length),
        accent: 'success',
      },
      {
        key: 'streak',
        label: '连板≥2',
        value: fNumber(streak2.length),
        accent: 'warning',
      },
      {
        key: 'max',
        label: '最高板',
        value: maxStreak > 0 ? `${maxStreak} 板` : '—',
        accent: 'primary',
        onClick: maxStreak > 0 ? onMaxStreakClick : undefined,
      },
      {
        key: 'seal',
        label: '封板率',
        value: sealRate != null ? fPercent(sealRate * 100) : '—',
        accent: 'info',
        tooltip: '封住数 / 触板数（依赖后端 limit-summary）',
      },
      {
        key: 'promote',
        label: '晋级率',
        value: promoteRate != null ? fPercent(promoteRate * 100) : '—',
        accent: 'info',
        tooltip: LIMIT_GLOSSARY.promoteRate,
      },
    ];
  }, [items, summaryList, onMaxStreakClick]);

  // 5 日趋势
  const sparklineUp = useMemo(
    () =>
      summaryList
        .slice()
        .reverse()
        .map((d) => d.limitUp),
    [summaryList]
  );
  const sparklineMaxStreak = useMemo(
    () =>
      summaryList
        .slice()
        .reverse()
        .map((d) => d.maxStreak),
    [summaryList]
  );

  return (
    <Grid container spacing={2}>
      {kpis.map((kpi) => (
        <Grid key={kpi.key} size={{ xs: 6, sm: 4, md: 2 }}>
          <Card
            sx={{
              p: 2,
              height: '100%',
              position: 'relative',
              cursor: kpi.onClick ? 'pointer' : 'default',
              transition: 'border-color 200ms',
              borderLeft: '2px solid',
              borderLeftColor: `${kpi.accent}.main`,
            }}
            onClick={kpi.onClick}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              {kpi.tooltip ? (
                <Tooltip title={kpi.tooltip} arrow placement="top">
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      borderBottom: '1px dashed',
                      borderBottomColor: 'divider',
                      cursor: 'help',
                    }}
                  >
                    {kpi.label}
                  </Typography>
                </Tooltip>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {kpi.label}
                </Typography>
              )}
            </Stack>
            <Typography
              variant="h5"
              sx={{
                mt: 0.5,
                color: `${kpi.accent}.main`,
                fontFeatureSettings: '"tnum"',
              }}
            >
              {kpi.value}
            </Typography>
            {kpi.delta != null ? (
              <Typography
                variant="caption"
                sx={{
                  color: kpi.delta >= 0 ? 'error.main' : 'success.main',
                  fontFeatureSettings: '"tnum"',
                }}
              >
                vs 5 日均值 {kpi.delta >= 0 ? '+' : ''}
                {fPercent(kpi.delta * 100)}
              </Typography>
            ) : null}
          </Card>
        </Grid>
      ))}

      {summaryList.length >= 2 ? (
        <Grid size={{ xs: 12 }}>
          <Card sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 88 }}>
                  近 {summaryList.length} 日 · 涨停家数
                </Typography>
                <MiniSparkline data={sparklineUp} color={theme.vars.palette.error.main} />
                <Typography
                  variant="body2"
                  sx={{ color: 'text.primary', fontFeatureSettings: '"tnum"' }}
                >
                  {fNumber(summaryList[0]?.limitUp ?? 0)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 88 }}>
                  近 {summaryList.length} 日 · 最高板
                </Typography>
                <MiniSparkline data={sparklineMaxStreak} color={theme.vars.palette.warning.main} />
                <Typography
                  variant="body2"
                  sx={{ color: 'text.primary', fontFeatureSettings: '"tnum"' }}
                >
                  {fNumber(summaryList[0]?.maxStreak ?? 0)} 板
                </Typography>
              </Stack>
            </Stack>
          </Card>
        </Grid>
      ) : null}
    </Grid>
  );
}
