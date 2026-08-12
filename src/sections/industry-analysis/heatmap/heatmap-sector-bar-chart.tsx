import type { HeatmapSectorSummary } from 'src/api/heatmap';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Mode = 'pct' | 'count';

type Props = {
  sectors: HeatmapSectorSummary[];
  loading: boolean;
  error: string;
};

export function HeatmapSectorBarChart({ sectors, loading, error }: Props) {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('pct');

  // --- pct mode: sorted by avgPctChg desc ---
  const sortedByPct = sectors
    .filter(
      (sector): sector is HeatmapSectorSummary & { avgPctChg: number } =>
        sector.avgPctChg != null
    )
    .sort((a, b) => b.avgPctChg - a.avgPctChg);

  const pctOptions = useChart({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: '70%',
        colors: {
          ranges: [
            { from: -100, to: 0, color: theme.palette.success.main },
            { from: 0, to: 100, color: theme.palette.error.main },
          ],
        },
      },
    },
    xaxis: {
      categories: sortedByPct.map((s) => s.groupName),
      labels: {
        formatter: (v: string) => `${Number(v).toFixed(1)}%`,
      },
    },
    yaxis: {
      labels: { style: { fontSize: '12px' } },
    },
    tooltip: {
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
    dataLabels: { enabled: false },
    grid: { xaxis: { lines: { show: true } } },
  });

  const pctSeries = [{ name: '涨跌幅', data: sortedByPct.map((s) => +s.avgPctChg.toFixed(2)) }];

  // --- count mode: sorted by (upCount - downCount) desc ---
  const sortedByCount = [...sectors].sort(
    (a, b) => b.upCount - b.downCount - (a.upCount - a.downCount)
  );

  const countOptions = useChart({
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    plotOptions: {
      bar: { horizontal: true, barHeight: '65%' },
    },
    colors: [theme.palette.error.main, theme.palette.success.main, theme.palette.grey[500]],
    xaxis: { categories: sortedByCount.map((s) => s.groupName) },
    yaxis: { labels: { style: { fontSize: '12px' } } },
    legend: { position: 'top' },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
  });

  const countSeries = [
    { name: '上涨', data: sortedByCount.map((s) => s.upCount) },
    { name: '下跌', data: sortedByCount.map((s) => s.downCount) },
    { name: '平盘', data: sortedByCount.map((s) => s.flatCount) },
  ];

  const activeSectors = mode === 'pct' ? sortedByPct : sortedByCount;
  const chartHeight = Math.max(400, activeSectors.length * 22);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">行业涨跌统计</Typography>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_e, v) => {
              if (v) setMode(v);
            }}
          >
            <ToggleButton value="pct">涨跌幅</ToggleButton>
            <ToggleButton value="count">涨跌家数</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {loading && (
          <Skeleton variant="rectangular" sx={{ borderRadius: 1 }} height={chartHeight} />
        )}

        {!loading && error && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {!loading && !error && sortedByPct.length > 0 && mode === 'pct' && (
          <Chart type="bar" series={pctSeries} options={pctOptions} sx={{ height: chartHeight }} />
        )}

        {!loading && !error && sectors.length > 0 && mode === 'count' && (
          <Chart
            type="bar"
            series={countSeries}
            options={countOptions}
            sx={{ height: chartHeight }}
          />
        )}

        {!loading &&
          !error &&
          (sectors.length === 0 || (mode === 'pct' && sortedByPct.length === 0)) && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            {sectors.length === 0 ? '暂无数据' : '暂无有效涨跌幅数据'}
          </Typography>
          )}
      </CardContent>
    </Card>
  );
}
