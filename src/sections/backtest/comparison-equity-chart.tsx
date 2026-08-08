import type { ComparisonEquitySeries } from 'src/api/backtest';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  series: ComparisonEquitySeries[];
};

export function ComparisonEquityChart({ series }: Props) {
  const theme = useTheme();
  const { categories, chartSeries } = useMemo(() => {
    const firstSeries = series[0];
    return {
      categories: firstSeries ? firstSeries.points.map((point) => point.tradeDate) : [],
      chartSeries: series.map((item, index) => ({
        name: item.label ?? `策略 ${index + 1}`,
        data: item.points.map((point) => {
          const value = point.value ?? point.nav;
          return value === null || value === undefined ? null : Number(value.toFixed(4));
        }),
      })),
    };
  }, [series]);
  const seriesColors = useMemo(
    () => [
      theme.palette.primary.main,
      theme.palette.error.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.primary.dark,
      theme.palette.info.dark,
      theme.palette.error.dark,
      theme.palette.success.dark,
    ],
    [theme]
  );
  const chartOptionsInput = useMemo(
    () => ({
      chart: { type: 'line' as const, toolbar: { show: false }, zoom: { enabled: false } },
      colors: seriesColors,
      xaxis: {
        categories,
        type: 'category' as const,
        tickAmount: 8,
        labels: { rotate: -30, style: { fontSize: '12px' } },
      },
      yaxis: {
        labels: { formatter: (val: number) => val.toFixed(2) },
      },
      dataLabels: { enabled: false },
      stroke: { width: 2, curve: 'smooth' as const },
      legend: { position: 'top' as const },
      tooltip: {
        y: { formatter: (val: number) => `NAV ${val.toFixed(4)}` },
      },
    }),
    [categories, seriesColors]
  );
  const chartOptions = useChart(chartOptionsInput);

  if (series.length === 0) {
    return (
      <Box sx={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.disabled">
          暂无净值数据
        </Typography>
      </Box>
    );
  }

  return <Chart type="line" series={chartSeries} options={chartOptions} sx={{ height: 320 }} />;
}
