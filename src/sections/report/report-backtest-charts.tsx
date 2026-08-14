import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Chart, useChart } from 'src/components/chart';

type NavCurveChartProps = {
  points: { date: string; nav: number }[];
};

export function ReportNavCurveChart({ points }: NavCurveChartProps) {
  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories: points.map((point) => point.date), tickAmount: 8 },
    yaxis: { labels: { formatter: (value: number) => value.toFixed(2) } },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => value.toFixed(4) },
    },
  });

  const series = [{ name: '策略净值', data: points.map((point) => Number(point.nav.toFixed(4))) }];

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          净值曲线
        </Typography>
        {points.length === 0 ? (
          <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 300 }} />
        )}
      </CardContent>
    </Card>
  );
}

type DrawdownCurveChartProps = {
  points: { date: string; drawdown: number }[];
};

export function ReportDrawdownCurveChart({ points }: DrawdownCurveChartProps) {
  const theme = useTheme();
  const series = [
    { name: '回撤', data: points.map((point) => Number((point.drawdown * 100).toFixed(2))) },
  ];
  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false } },
    colors: [theme.palette.error.main],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    stroke: { width: 2, curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories: points.map((point) => point.date), tickAmount: 8 },
    yaxis: { labels: { formatter: (value: number) => `${value.toFixed(1)}%` } },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (value: number) => `${value.toFixed(2)}%` },
    },
  });

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          回撤曲线
        </Typography>
        {points.length === 0 ? (
          <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 200 }} />
        )}
      </CardContent>
    </Card>
  );
}
