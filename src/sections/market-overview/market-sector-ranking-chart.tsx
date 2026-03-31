import type { SectorRankingItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchSectorRanking } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type SortBy = 'pct_change' | 'net_amount';

type Props = {
  tradeDate?: string;
};

export function MarketSectorRankingChart({ tradeDate }: Props) {
  const theme = useTheme();
  const [sortBy, setSortBy] = useState<SortBy>('pct_change');
  const [sectors, setSectors] = useState<SectorRankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSectorRanking({ trade_date: tradeDate, sort_by: sortBy, limit: 30 })
      .then((res) => {
        if (!cancelled) setSectors(res?.sectors ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载行业排行失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, sortBy]);

  // Sort ascending so the chart reads top-to-bottom as best → worst
  const sorted = [...sectors].sort((a, b) =>
    sortBy === 'pct_change'
      ? a.pctChange - b.pctChange
      : a.netAmount - b.netAmount
  );

  const values = sorted.map((s) =>
    sortBy === 'pct_change' ? s.pctChange : +(s.netAmount / 100000000).toFixed(2)
  );

  const barColors = values.map((v) =>
    v >= 0 ? theme.palette.error.main : theme.palette.success.main
  );

  const chartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 3,
        dataLabels: { position: 'top' },
      },
    },
    colors: barColors.length > 0 ? barColors : [theme.palette.primary.main],
    legend: { show: false },
    xaxis: {
      categories: sorted.map((s) => s.name),
      labels: {
        formatter: (v: string) =>
          sortBy === 'pct_change' ? `${Number(v).toFixed(2)}%` : `${Number(v).toFixed(1)}亿`,
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (v: number) =>
        sortBy === 'pct_change' ? `${v.toFixed(2)}%` : `${v.toFixed(1)}亿`,
      style: { colors: [theme.palette.text.primary], fontSize: '10px' },
    },
    tooltip: { shared: false, intersect: true },
  });

  const series = [
    {
      name: sortBy === 'pct_change' ? '涨跌幅(%)' : '净流入(亿)',
      data: values,
    },
  ];

  const chartHeight = Math.max(300, sorted.length * 22);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">行业涨跌排行</Typography>

          <ToggleButtonGroup
            exclusive
            value={sortBy}
            size="small"
            onChange={(_, v) => {
              if (v) setSortBy(v);
            }}
          >
            <ToggleButton value="pct_change">涨跌幅</ToggleButton>
            <ToggleButton value="net_amount">净流入</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Skeleton variant="rectangular" height={400} />
        ) : sorted.length === 0 ? (
          <Box
            sx={{
              height: 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="bar" series={series} options={chartOptions} sx={{ height: chartHeight }} />
        )}
      </CardContent>
    </Card>
  );
}
