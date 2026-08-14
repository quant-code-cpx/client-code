import type { RotationDetailResult } from 'src/api/market';

import { memo } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { Chart, useChart } from 'src/components/chart';

const yuanToYi = (value: number | null | undefined): number | null =>
  value == null ? null : +(value / 1e8).toFixed(2);

export const RotationReturnTrendChart = memo(function RotationReturnTrendChartComponent({
  data,
}: {
  data: RotationDetailResult['returnTrend'];
}) {
  const categories = data.map((item) => fmtTradeDate(item.tradeDate));
  const sectorSeries = data.map((item) => item.cumReturn);
  const benchmarkSeries = data.map((item) => item.benchmarkReturn);
  const hasBenchmark = benchmarkSeries.some((value) => value != null);

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    stroke: { curve: 'smooth', width: [2, 2], dashArray: [0, 4] },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: { labels: { formatter: (value: number) => `${value.toFixed(2)}%` } },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => `${value.toFixed(2)}%` },
    },
    legend: { position: 'top', fontSize: '12px' },
  });

  const series = [
    { name: '行业', data: sectorSeries },
    ...(hasBenchmark ? [{ name: '沪深300', data: benchmarkSeries }] : []),
  ];

  if (data.length === 0) {
    return (
      <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled">暂无数据</Typography>
      </Box>
    );
  }

  return (
    <>
      {!hasBenchmark && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          后端暂未提供沪深300基准收益，当前仅展示行业收益。
        </Alert>
      )}
      <Chart type="line" series={series} options={chartOptions} sx={{ height: 240 }} />
    </>
  );
});

export const RotationFlowTrendChart = memo(function RotationFlowTrendChartComponent({
  data,
}: {
  data: RotationDetailResult['flowTrend'];
}) {
  const theme = useTheme();
  const categories = data.map((item) => fmtTradeDate(item.tradeDate));
  const dailyNet = data.map((item) => yuanToYi(item.netInflow) ?? 0);
  const cumulative = data.map((item) => yuanToYi(item.cumulativeInflow) ?? 0);

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false, toolbar: { show: false } },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -1e9, to: 0, color: theme.palette.success.main },
            { from: 0, to: 1e9, color: theme.palette.error.main },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '12px' } } },
    yaxis: [
      {
        title: { text: '每日净流入(亿)' },
        labels: { formatter: (value: number) => `${value.toFixed(1)}亿` },
      },
      {
        opposite: true,
        title: { text: '累计净流入(亿)' },
        labels: { formatter: (value: number) => `${value.toFixed(1)}亿` },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => `${value.toFixed(2)}亿` },
    },
    legend: { position: 'top', fontSize: '12px' },
  });

  const series = [
    { name: '每日净流入', type: 'column', data: dailyNet },
    { name: '累计净流入', type: 'line', data: cumulative },
  ];

  if (data.length === 0) {
    return (
      <Box sx={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.disabled">暂无数据</Typography>
      </Box>
    );
  }

  return <Chart type="line" series={series} options={chartOptions} sx={{ height: 240 }} />;
});
