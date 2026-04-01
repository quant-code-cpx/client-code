import type { BacktestEquityPoint } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

interface BacktestEquityChartProps {
  points: BacktestEquityPoint[];
}

export function BacktestEquityChart({ points }: BacktestEquityChartProps) {
  const categories = points.map((p) => p.tradeDate);

  const series = [
    { name: '策略净值', data: points.map((p) => Number(p.nav.toFixed(4))) },
    { name: '基准净值', data: points.map((p) => Number(p.benchmarkNav.toFixed(4))) },
  ];

  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    stroke: { width: [2, 2], curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories, tickAmount: 8 },
    yaxis: {
      labels: { formatter: (v: number) => v.toFixed(2) },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => v.toFixed(4) },
    },
    legend: { show: true, position: 'top' },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          净值曲线
        </Typography>
        {points.length === 0 ? (
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无净值数据
            </Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} height={300} />
        )}
      </CardContent>
    </Card>
  );
}
