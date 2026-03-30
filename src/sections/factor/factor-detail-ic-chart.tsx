import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';
import { factorApi } from 'src/api/factor';
import type { FactorIcResult } from 'src/api/factor';

// ----------------------------------------------------------------------

type AnalysisParams = {
  startDate: string;
  endDate: string;
  universe?: string;
};

type FactorDetailIcChartProps = {
  factorName: string;
  params: AnalysisParams;
};

function computeMA(data: number[], window: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < window - 1) return null;
    const slice = data.slice(i - window + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / window;
  });
}

// ----------------------------------------------------------------------

export function FactorDetailIcChart({ factorName, params }: FactorDetailIcChartProps) {
  const theme = useTheme();
  const [result, setResult] = useState<FactorIcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!factorName) return;
    setLoading(true);
    setError('');
    try {
      const data = await factorApi.ic({
        factorName,
        startDate: params.startDate,
        endDate: params.endDate,
        universe: params.universe,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'IC 分析失败');
    } finally {
      setLoading(false);
    }
  }, [factorName, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const icValues = result?.series.map((d) => d.ic) ?? [];
  const ma20 = computeMA(icValues, 20);
  const categories = result?.series.map((d) => d.tradeDate) ?? [];

  const cumulativeIc = icValues.reduce<number[]>((acc, d, i) => {
    acc.push((acc[i - 1] ?? 0) + d);
    return acc;
  }, []);

  const barChartOptions = useChart({
    chart: { type: 'line', stacked: false, toolbar: { show: true }, zoom: { enabled: true } },
    stroke: { width: [0, 2], curve: 'smooth', colors: [undefined, theme.palette.warning.main] },
    plotOptions: {
      bar: {
        colors: {
          ranges: [
            { from: -1, to: 0, color: theme.palette.warning.light },
            { from: 0, to: 1, color: theme.palette.primary.light },
          ],
        },
      },
    },
    xaxis: { type: 'category', categories },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(3) } },
    annotations: {
      yaxis: [{ y: 0, borderColor: theme.palette.text.disabled, strokeDashArray: 4 }],
    },
    dataLabels: { enabled: false },
    legend: { show: true },
    tooltip: { shared: true, y: { formatter: (v: number) => v.toFixed(4) } },
  });

  const areaChartOptions = useChart({
    chart: { type: 'area', toolbar: { show: true }, zoom: { enabled: true } },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: { type: 'category', categories },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (v: number) => v.toFixed(4) } },
  });

  const { icMean, icIr, icPositiveRate, tStat } = result?.summary ?? {
    icMean: 0,
    icIr: 0,
    icPositiveRate: 0,
    tStat: 0,
  };

  const summaryCards = [
    {
      label: 'IC 均值',
      value: icMean.toFixed(4),
      color: Math.abs(icMean) > 0.02 ? theme.palette.success.main : theme.palette.text.secondary,
    },
    {
      label: 'ICIR',
      value: icIr.toFixed(4),
      color: Math.abs(icIr) > 0.5 ? theme.palette.success.main : theme.palette.text.secondary,
    },
    {
      label: 'IC > 0 占比',
      value: `${(icPositiveRate * 100).toFixed(1)}%`,
      color: theme.palette.text.secondary,
    },
    {
      label: 't 统计量',
      value: tStat.toFixed(4),
      bold: Math.abs(tStat) > 2,
      color: theme.palette.text.secondary,
    },
  ];

  if (loading) {
    return (
      <Box>
        <Grid container={true} spacing={2} sx={{ mb: 3 }}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!result) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body2" color="text.secondary">
          请设置参数后点击"开始分析"
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 统计卡片 */}
      <Grid container={true} spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {card.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: card.color, fontWeight: card.bold === true ? 700 : 400, mt: 0.5 }}
              >
                {card.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* IC 时序柱状图 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="IC 时序" subheader={`${result.icMethod === 'rank' ? 'Rank IC' : 'IC'} · 预测期 ${result.forwardDays} 日`} />
        <CardContent>
          <Chart
            type="bar"
            series={[
              { name: 'IC值', type: 'bar', data: icValues },
              { name: '20日均线', type: 'line', data: ma20 as number[] },
            ]}
            options={barChartOptions}
            sx={{ height: 360 }}
          />
        </CardContent>
      </Card>

      {/* IC 累计曲线 */}
      <Card>
        <CardHeader title="IC 累计曲线" />
        <CardContent>
          <Chart
            type="area"
            series={[{ name: 'IC 累计', data: cumulativeIc }]}
            options={areaChartOptions}
            sx={{ height: 300 }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
