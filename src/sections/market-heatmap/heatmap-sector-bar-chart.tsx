import type { HeatmapSectorSummary } from 'src/api/market';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchHeatmapData } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Mode = 'pct' | 'count';

type Props = {
  tradeDate?: string;
};

export function HeatmapSectorBarChart({ tradeDate }: Props) {
  const theme = useTheme();
  const [sectors, setSectors] = useState<HeatmapSectorSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('pct');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchHeatmapData({ trade_date: tradeDate });
        setSectors(result.sectors ?? []);
      } catch {
        setError('行业涨跌数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tradeDate]);

  // --- pct mode: sorted by pctChg desc ---
  const sortedByPct = [...sectors].sort((a, b) => b.pctChg - a.pctChg);

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
      categories: sortedByPct.map((s) => s.industry),
      labels: {
         
        formatter: (v: any) => `${Number(v).toFixed(1)}%`,
      },
    },
    yaxis: {
      labels: { style: { fontSize: '11px' } },
    },
    tooltip: {
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
    dataLabels: { enabled: false },
    grid: { xaxis: { lines: { show: true } } },
  });

  const pctSeries = [{ name: '涨跌幅', data: sortedByPct.map((s) => +s.pctChg.toFixed(2)) }];

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
    xaxis: { categories: sortedByCount.map((s) => s.industry) },
    yaxis: { labels: { style: { fontSize: '11px' } } },
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

        {!loading && !error && sectors.length > 0 && mode === 'pct' && (
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

        {!loading && !error && sectors.length === 0 && (
          <Typography color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
