import type { BacktestEquityPoint } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

interface BacktestDrawdownChartProps {
  points: BacktestEquityPoint[];
}

export function BacktestDrawdownChart({ points }: BacktestDrawdownChartProps) {
  const theme = useTheme();
  const categories = points.map((p) => p.tradeDate);

  const series = [{ name: '回撤', data: points.map((p) => Number((p.drawdown * 100).toFixed(2))) }];

  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    colors: [theme.palette.error.main],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories, tickAmount: 8 },
    yaxis: {
      labels: { formatter: (v: number) => `${v.toFixed(1)}%` },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          回撤曲线
        </Typography>
        {points.length === 0 ? (
          <Box
            sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无回撤数据
            </Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 200 }} />
        )}
      </CardContent>
    </Card>
  );
}
