import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import dayjs from 'dayjs';

import { Chart, useChart } from 'src/components/chart';
import type { FactorCorrelationResult } from 'src/api/factor';

// ----------------------------------------------------------------------

type FactorCorrelationHeatmapProps = {
  result: FactorCorrelationResult;
};

export function FactorCorrelationHeatmap({ result }: FactorCorrelationHeatmapProps) {
  const theme = useTheme();

  const series = result.factors.map((_, rowIdx) => ({
    name: result.factorLabels[rowIdx],
    data: result.factors.map((_, colIdx) => ({
      x: result.factorLabels[colIdx],
      y: Number(result.matrix[rowIdx][colIdx].toFixed(3)),
    })),
  }));

  const chartOptions = useChart({
    chart: { type: 'heatmap' },
    dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(2) },
    plotOptions: {
      heatmap: {
        shadeIntensity: 0.9,
        radius: 0,
        useFillColorAsStroke: false,
        colorScale: {
          ranges: [
            { from: -1, to: -0.5, color: '#1e40af', name: '强负相关' },
            { from: -0.5, to: -0.2, color: '#93c5fd', name: '弱负相关' },
            { from: -0.2, to: 0.2, color: '#f9fafb', name: '无相关' },
            { from: 0.2, to: 0.5, color: '#fca5a5', name: '弱正相关' },
            { from: 0.5, to: 1, color: '#dc2626', name: '强正相关' },
          ],
        },
      },
    },
    xaxis: { type: 'category' },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => v.toFixed(3) } },
  });

  const dynamicHeight = result.factors.length * 40 + 60;

  return (
    <Card>
      <CardHeader
        title="因子相关性热力图"
        subheader={`方法：${result.method === 'spearman' ? 'Spearman' : 'Pearson'} · 日期：${dayjs(result.tradeDate, 'YYYYMMDD').format('YYYY-MM-DD')}`}
      />
      <CardContent>
        <Box sx={{ height: dynamicHeight }}>
          <Chart type="heatmap" series={series} options={chartOptions} sx={{ height: dynamicHeight }} />
        </Box>
      </CardContent>
    </Card>
  );
}
