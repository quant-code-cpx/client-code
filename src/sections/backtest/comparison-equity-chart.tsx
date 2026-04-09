import type { ComparisonEquitySeries } from 'src/api/backtest';

import Chart from 'react-apexcharts';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const SERIES_COLORS = [
  '#2196F3',
  '#F44336',
  '#4CAF50',
  '#FF9800',
  '#9C27B0',
  '#00BCD4',
  '#795548',
  '#607D8B',
  '#E91E63',
  '#CDDC39',
];

type Props = {
  series: ComparisonEquitySeries[];
};

export function ComparisonEquityChart({ series }: Props) {
  const firstSeries = series[0];
  const categories = firstSeries ? firstSeries.points.map((p) => p.tradeDate) : [];

  const chartSeries = series.map((s, i) => ({
    name: s.label ?? `策略 ${i + 1}`,
    data: s.points.map((p) => Number(p.nav.toFixed(4))),
  }));

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false } },
    colors: SERIES_COLORS,
    xaxis: {
      categories,
      type: 'category',
      tickAmount: 8,
      labels: { rotate: -30, style: { fontSize: '11px' } },
    },
    yaxis: {
      labels: { formatter: (val: number) => val.toFixed(2) },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: 'smooth' },
    legend: { position: 'top' },
    tooltip: {
      y: { formatter: (val: number) => `NAV ${val.toFixed(4)}` },
    },
  });

  if (series.length === 0) {
    return (
      <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.disabled">
          暂无净值数据
        </Typography>
      </Box>
    );
  }

  return <Chart type="line" series={chartSeries} options={chartOptions} height={320} />;
}
