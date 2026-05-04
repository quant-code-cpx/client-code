import type { Strategy , StrategyPerformance } from 'src/api/strategy';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { fPercent } from 'src/utils/format-number';

import { getStrategyPerformance } from 'src/api/strategy';

import { QuoteText, getQuoteColor } from './quote-text';

// ----------------------------------------------------------------------

interface StrategyPerformanceCardProps {
  strategy: Strategy;
}

/** 最新一次回测的 4 大 KPI + NAV 迷你折线图（Sparkline） */
export function StrategyPerformanceCard({ strategy }: StrategyPerformanceCardProps) {
  const theme = useTheme();
  const [perf, setPerf] = useState<StrategyPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getStrategyPerformance(strategy.id)
      .then((data) => {
        if (!cancelled) setPerf(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载业绩数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [strategy.id]);

  return (
    <Card>
      <CardHeader
        title="业绩快照"
        subheader={
          perf?.navSeries?.length
            ? `${perf.navSeries[0]?.date ?? ''} ~ ${perf.navSeries[perf.navSeries.length - 1]?.date ?? ''}`
            : undefined
        }
        titleTypographyProps={{ variant: 'subtitle1' }}
        subheaderTypographyProps={{ variant: 'caption' }}
        sx={{ pb: 0 }}
      />
      <CardContent>
        {loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={52} />
            ))}
          </Box>
        )}

        {!loading && error && (
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        )}

        {!loading && !error && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 2 }}>
              <KpiItem label="累计收益" value={perf?.totalReturn ?? null} format="percent" />
              <KpiItem label="年化收益" value={perf?.annualizedReturn ?? null} format="percent" />
              <KpiItem label="夏普比率" value={perf?.sharpeRatio ?? null} format="number" />
              <KpiItem label="最大回撤" value={perf?.maxDrawdown ?? null} format="percent" isDrawdown />
            </Box>

            {/* Baseline comparison */}
            {perf?.baseline && (
              <>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    基准累计收益：
                  </Typography>
                  <QuoteText value={perf.baseline.totalReturn} format="percent" variant="caption" />
                </Box>
              </>
            )}

            {/* Sparkline */}
            {perf?.navSeries && perf.navSeries.length > 1 && (
              <Box sx={{ mt: 2 }}>
                <NavSparkline
                  series={perf.navSeries}
                  baseline={perf.baseline?.navSeries ?? null}
                  color={getQuoteColor(perf.totalReturn, theme)}
                />
              </Box>
            )}
          </>
        )}

        {!loading && !error && !perf && (
          <Typography variant="body2" color="text.secondary">
            暂无回测数据，请先运行回测
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

interface KpiItemProps {
  label: string;
  value: number | null;
  format: 'percent' | 'number';
  isDrawdown?: boolean;
}

function KpiItem({ label, value, format, isDrawdown }: KpiItemProps) {
  const theme = useTheme();

  // 最大回撤用特殊颜色逻辑：回撤越大（负值越大）越红
  const color = isDrawdown
    ? value !== null && value < 0
      ? theme.palette.error.main
      : theme.palette.text.secondary
    : getQuoteColor(value, theme);

  const formatted =
    value === null
      ? '--'
      : format === 'percent'
        ? (value > 0 ? '+' : '') + fPercent(value)
        : value.toFixed(2);

  return (
    <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          color,
          fontFeatureSettings: '"tnum"',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
        }}
      >
        {formatted}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

/** 简易 SVG Sparkline，不引入额外图表库 */
function NavSparkline({
  series,
  baseline,
  color,
}: {
  series: Array<{ date: string; nav: number }>;
  baseline: Array<{ date: string; nav: number }> | null;
  color: string | undefined;
}) {
  const theme = useTheme();
  const W = 280;
  const H = 60;
  const PAD = 4;

  const toPath = (data: Array<{ nav: number }>) => {
    const minV = Math.min(...data.map((d) => d.nav));
    const maxV = Math.max(...data.map((d) => d.nav));
    const range = maxV - minV || 1;
    return data
      .map((d, i) => {
        const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
        const y = H - PAD - ((d.nav - minV) / range) * (H - PAD * 2);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const lastNav = series[series.length - 1].nav;
  const baselineChange = baseline?.length
    ? ((lastNav / (baseline[0]?.nav ?? 1) - 1) * 100).toFixed(2)
    : null;

  return (
    <Box>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {baseline && baseline.length > 1 && (
          <path
            d={toPath(baseline)}
            fill="none"
            stroke={theme.palette.text.disabled}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        )}
        <path
          d={toPath(series)}
          fill="none"
          stroke={color ?? theme.palette.text.primary}
          strokeWidth={1.5}
        />
      </svg>
      {baselineChange !== null && (
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Tooltip title="策略 NAV 曲线" placement="top">
            <Chip
              size="small"
              label="策略"
              sx={{ height: 18, fontSize: 11, bgcolor: color, color: '#fff' }}
            />
          </Tooltip>
          <Tooltip title="基准 NAV 曲线（虚线）" placement="top">
            <Chip
              size="small"
              label={`基准 ${Number(baselineChange) > 0 ? '+' : ''}${baselineChange}%`}
              sx={{ height: 18, fontSize: 11 }}
              variant="outlined"
            />
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
