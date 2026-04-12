import type { MonteCarloResponse } from 'src/api/backtest';

import { varAlpha } from 'minimal-shared/utils';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';

import { runMonteCarlo } from 'src/api/backtest';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

interface MonteCarloStat {
  label: string;
  value: string;
  color?: 'success' | 'error' | 'default';
}

interface BacktestMonteCarloPanelProps {
  runId: string;
}

function formatPct(v: number) {
  return `${(v * 100).toFixed(2)}%`;
}

export function BacktestMonteCarloPanel({ runId }: BacktestMonteCarloPanelProps) {
  const theme = useTheme();
  const [simulations, setSimulations] = useState(1000);
  const [result, setResult] = useState<MonteCarloResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await runMonteCarlo({ runId, numSimulations: simulations });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '蒙特卡洛模拟失败');
    } finally {
      setLoading(false);
    }
  }, [runId, simulations]);

  const stats: MonteCarloStat[] = useMemo(
    () =>
      result
        ? [
            {
              label: '期望年化收益',
              value: formatPct(result.stats.expectedReturn),
              color: result.stats.expectedReturn >= 0 ? 'success' : 'error',
            },
            { label: '期望年化波动率', value: formatPct(result.stats.expectedVolatility) },
            {
              label: '95% VaR',
              value: formatPct(result.stats.var95),
              color: 'error',
            },
            {
              label: '95% CVaR',
              value: formatPct(result.stats.cvar95),
              color: 'error',
            },
            {
              label: '最差路径回撤',
              value: formatPct(result.stats.worstDrawdown),
              color: 'error',
            },
            {
              label: '最优路径年化',
              value: formatPct(result.stats.bestReturn),
              color: 'success',
            },
            {
              label: '最差路径年化',
              value: formatPct(result.stats.worstReturn),
              color: 'error',
            },
            {
              label: '正收益概率',
              value: formatPct(result.stats.probPositive),
              color: result.stats.probPositive >= 0.5 ? 'success' : 'error',
            },
          ]
        : [],
    [result]
  );

  const categories = useMemo(() => result?.paths.map((p) => `Day ${p.day}`) ?? [], [result]);

  const chartSeries = useMemo(
    () =>
      result
        ? [
            {
              name: '5%~95%',
              type: 'rangeArea' as const,
              data: result.paths.map((p) => ({ x: `Day ${p.day}`, y: [p.p5, p.p95] })),
            },
            {
              name: '25%~75%',
              type: 'rangeArea' as const,
              data: result.paths.map((p) => ({ x: `Day ${p.day}`, y: [p.p25, p.p75] })),
            },
            {
              name: '中位数',
              type: 'line' as const,
              data: result.paths.map((p) => ({ x: `Day ${p.day}`, y: p.median })),
            },
          ]
        : [],
    [result]
  );

  const chartOptions = useChart({
    chart: { type: 'rangeArea', toolbar: { show: false }, animations: { enabled: false } },
    stroke: {
      curve: 'smooth',
      width: [0, 0, 2],
      dashArray: [0, 0, 5],
    },
    fill: {
      opacity: [0.08, 0.2, 1],
    },
    colors: [theme.palette.primary.main, theme.palette.primary.main, theme.palette.primary.dark],
    xaxis: { type: 'category', categories, tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(2) } },
    tooltip: { shared: false, intersect: false },
    legend: { show: true, position: 'top' },
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <TextField
          label="模拟次数"
          type="number"
          size="small"
          value={simulations}
          onChange={(e) => setSimulations(Number(e.target.value))}
          inputProps={{ min: 100, max: 10000, step: 100 }}
          sx={{ width: 140 }}
          disabled={loading}
        />
        <Button
          variant="contained"
          onClick={handleRun}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {loading ? '模拟中…' : '运行模拟'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <>
          {/* Stats cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {stats.map((s) => (
              <Grid key={s.label} size={{ xs: 6, sm: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', display: 'block' }}
                    >
                      {s.label}
                    </Typography>
                    <Typography
                      variant="h5"
                      sx={{
                        mt: 0.5,
                        color:
                          s.color === 'success'
                            ? 'success.main'
                            : s.color === 'error'
                              ? 'error.main'
                              : 'text.primary',
                      }}
                    >
                      {s.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Envelope chart */}
          {result.paths.length > 0 && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  净值分位数包络线（{result.simulations.toLocaleString()} 条路径）
                </Typography>
                <Chart
                  type="rangeArea"
                  series={chartSeries}
                  options={chartOptions}
                  sx={{ height: 320 }}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!result && !loading && (
        <Box
          sx={{
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.04),
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            点击「运行模拟」以开始蒙特卡洛分析
          </Typography>
        </Box>
      )}
    </Box>
  );
}
