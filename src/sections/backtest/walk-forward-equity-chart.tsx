import type { WalkForwardEquityPoint } from 'src/api/backtest';

import Chart from 'react-apexcharts';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  points: WalkForwardEquityPoint[];
};

export function WalkForwardEquityChart({ points }: Props) {
  const categories = points.map((p) => p.tradeDate);
  const navData = points.map((p) => Number(p.nav.toFixed(4)));
  const hasBenchmark = points.some((p) => p.benchmarkNav !== null && p.benchmarkNav !== undefined);
  const benchmarkData = points.map((p) =>
    p.benchmarkNav !== null && p.benchmarkNav !== undefined
      ? Number(p.benchmarkNav.toFixed(4))
      : null
  );

  const chartOptions = useChart({
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false } },
    xaxis: {
      categories,
      type: 'category',
      tickAmount: 8,
      labels: { rotate: -30, style: { fontSize: '12px' } },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => val.toFixed(2),
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
    tooltip: {
      x: { show: true },
      y: { formatter: (val: number) => `NAV ${val.toFixed(4)}` },
    },
  });

  if (points.length === 0) {
    return (
      <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.disabled">
          暂无 OOS 净值数据
        </Typography>
      </Box>
    );
  }

  return (
    <Chart
      type="area"
      series={[
        { name: 'OOS 净值', data: navData },
        ...(hasBenchmark ? [{ name: '基准净值', data: benchmarkData }] : []),
      ]}
      options={chartOptions}
      height={280}
    />
  );
}
