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

import dayjs from 'dayjs';

import { Chart, useChart } from 'src/components/chart';
import { factorApi } from 'src/api/factor';
import type { FactorDistributionResult } from 'src/api/factor';

// ----------------------------------------------------------------------

type AnalysisParams = {
  startDate: string;
  endDate: string;
  universe?: string;
};

type FactorDetailDistributionChartProps = {
  factorName: string;
  params: AnalysisParams;
};

// ----------------------------------------------------------------------

export function FactorDetailDistributionChart({
  factorName,
  params,
}: FactorDetailDistributionChartProps) {
  const theme = useTheme();
  const [result, setResult] = useState<FactorDistributionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!factorName) return;
    setLoading(true);
    setError('');
    try {
      // Use endDate as the snapshot date
      const data = await factorApi.distribution({
        factorName,
        tradeDate: params.endDate,
        universe: params.universe,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取分布数据失败');
    } finally {
      setLoading(false);
    }
  }, [factorName, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const histSeries = result
    ? [{ name: '股票数量', data: result.histogram.map((b) => b.count) }]
    : [];

  const histCategories = result?.histogram.map((b) => b.binStart.toFixed(1)) ?? [];

  const histOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: { bar: { borderRadius: 0, columnWidth: '99%' } },
    xaxis: { categories: histCategories, tickAmount: 10, labels: { rotate: -45 } },
    dataLabels: { enabled: false },
    colors: [theme.palette.primary.main],
    tooltip: {
      custom: ({ dataPointIndex }: { dataPointIndex: number }) => {
        if (!result) return '';
        const bin = result.histogram[dataPointIndex];
        return `<div style="padding:8px;font-size:13px">${bin.binStart.toFixed(2)} ~ ${bin.binEnd.toFixed(2)}<br/>数量: ${bin.count}</div>`;
      },
    },
  });

  const statsCards = result
    ? [
        { label: '有效数量', value: `${result.stats.count}` },
        { label: '缺失率', value: `${(result.stats.missingRate * 100).toFixed(2)}%` },
        { label: '均值 / 中位数', value: `${result.stats.mean.toFixed(4)} / ${result.stats.median.toFixed(4)}` },
        { label: '标准差', value: result.stats.stdDev.toFixed(4) },
        { label: '偏度 / 峰度', value: `${result.stats.skewness.toFixed(3)} / ${result.stats.kurtosis.toFixed(3)}` },
        { label: '5% ~ 95% 区间', value: `${result.stats.q5.toFixed(4)} ~ ${result.stats.q95.toFixed(4)}` },
      ]
    : [];

  if (loading) {
    return (
      <Box>
        <Grid container={true} spacing={2} sx={{ mb: 3 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2 }} />
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
        {statsCards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {card.label}
              </Typography>
              <Typography variant="subtitle1" sx={{ mt: 0.5, fontWeight: 600 }}>
                {card.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* 直方图 */}
      <Card>
        <CardHeader
          title="因子值分布"
          subheader={`截面日期：${dayjs(result.tradeDate, 'YYYYMMDD').format('YYYY-MM-DD')}`}
        />
        <CardContent>
          <Chart type="bar" series={histSeries} options={histOptions} sx={{ height: 360 }} />
        </CardContent>
      </Card>
    </Box>
  );
}
