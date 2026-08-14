import type { WalkForwardEquityPoint } from 'src/api/backtest';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { fmtTradeDate } from 'src/utils/format-time';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  points: WalkForwardEquityPoint[];
};

export function WalkForwardEquityChart({ points }: Props) {
  const { categories, navData, hasBenchmark, benchmarkData } = useMemo(
    () => ({
      categories: points.map((point) => fmtTradeDate(point.tradeDate)),
      navData: points.map((point) => Number(point.nav.toFixed(4))),
      hasBenchmark: points.some(
        (point) => point.benchmarkNav !== null && point.benchmarkNav !== undefined
      ),
      benchmarkData: points.map((point) =>
        point.benchmarkNav !== null && point.benchmarkNav !== undefined
          ? Number(point.benchmarkNav.toFixed(4))
          : null
      ),
    }),
    [points]
  );
  const chartOptionsInput = useMemo(
    () => ({
      chart: { type: 'area' as const, toolbar: { show: false }, zoom: { enabled: false } },
      xaxis: {
        categories,
        type: 'category' as const,
        tickAmount: 8,
        labels: { rotate: -30, style: { fontSize: '12px' } },
      },
      yaxis: {
        labels: {
          formatter: (val: number) => val.toFixed(2),
        },
      },
      dataLabels: { enabled: false },
      stroke: { width: 2, curve: 'smooth' as const },
      fill: { type: 'gradient' as const, gradient: { opacityFrom: 0.4, opacityTo: 0 } },
      tooltip: {
        x: { show: true },
        y: { formatter: (val: number) => `NAV ${val.toFixed(4)}` },
      },
    }),
    [categories]
  );
  const chartOptions = useChart(chartOptionsInput);
  const chartSeries = useMemo(
    () => [
      { name: 'OOS 净值', data: navData },
      ...(hasBenchmark ? [{ name: '基准净值', data: benchmarkData }] : []),
    ],
    [benchmarkData, hasBenchmark, navData]
  );

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
      series={chartSeries}
      options={chartOptions}
      sx={{ height: 280 }}
    />
  );
}
