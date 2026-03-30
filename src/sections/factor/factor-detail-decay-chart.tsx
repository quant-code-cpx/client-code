import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';
import { factorApi } from 'src/api/factor';
import type { FactorDecayResult } from 'src/api/factor';

// ----------------------------------------------------------------------

type AnalysisParams = {
  startDate: string;
  endDate: string;
  universe?: string;
};

type FactorDetailDecayChartProps = {
  factorName: string;
  params: AnalysisParams;
};

// ----------------------------------------------------------------------

export function FactorDetailDecayChart({ factorName, params }: FactorDetailDecayChartProps) {
  const theme = useTheme();
  const [result, setResult] = useState<FactorDecayResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!factorName) return;
    setLoading(true);
    setError('');
    try {
      const data = await factorApi.decay({
        factorName,
        startDate: params.startDate,
        endDate: params.endDate,
        universe: params.universe,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取衰减数据失败');
    } finally {
      setLoading(false);
    }
  }, [factorName, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const series = result
    ? [
        {
          name: 'IC均值',
          type: 'bar',
          data: result.results.map((r) => Number(r.icMean.toFixed(4))),
        },
        {
          name: 'ICIR',
          type: 'line',
          data: result.results.map((r) => Number(r.icIr.toFixed(4))),
        },
      ]
    : [];

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 3], curve: 'smooth' },
    plotOptions: {
      bar: {
        colors: {
          ranges: [
            { from: -1, to: 0, color: theme.palette.warning.main },
            { from: 0, to: 1, color: theme.palette.primary.main },
          ],
        },
      },
    },
    xaxis: { categories: result?.results.map((r) => `${r.period}日`) ?? [] },
    yaxis: [
      {
        title: { text: 'IC均值' },
        labels: { formatter: (v: number) => v.toFixed(3) },
      },
      {
        opposite: true,
        title: { text: 'ICIR' },
        labels: { formatter: (v: number) => v.toFixed(3) },
      },
    ],
    dataLabels: {
      enabled: true,
      enabledOnSeries: [0],
      formatter: (v: number) => v.toFixed(3),
    },
    legend: { show: true },
    tooltip: { shared: false, y: { formatter: (v: number) => v.toFixed(4) } },
  });

  if (loading) {
    return <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />;
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
    <Card>
      <CardHeader
        title="因子衰减分析"
        subheader="不同预测期的 IC 均值与 ICIR"
      />
      <CardContent>
        <Chart type="bar" series={series} options={chartOptions} sx={{ height: 360 }} />
      </CardContent>
    </Card>
  );
}
