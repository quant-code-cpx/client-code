import type { ValuationTrendItem } from 'src/api/market';

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

import { fetchValuationTrend } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

const PERIODS = [
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: '3y', label: '3Y' },
  { value: '5y', label: '5Y' },
];

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketValuationTrendChart({ tradeDate: _tradeDate }: Props) {
  const theme = useTheme();
  const [period, setPeriod] = useState('1y');
  const [data, setData] = useState<ValuationTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchValuationTrend({ period })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载估值趋势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const peSeries = data.map((d) => d.peTtmMedian);
  const pbSeries = data.map((d) => d.pbMedian);

  const chartOptions = useChart({
    chart: { type: 'line' },
    stroke: { curve: 'smooth', width: [2, 2] },
    colors: [theme.palette.primary.main, theme.palette.warning.main],
    xaxis: { categories, labels: { rotate: -30 } },
    yaxis: [
      {
        title: { text: 'PE_TTM' },
        labels: { formatter: (v: number) => v.toFixed(1) },
      },
      {
        opposite: true,
        title: { text: 'PB' },
        labels: { formatter: (v: number) => v.toFixed(2) },
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
  });

  const series = [
    { name: 'PE_TTM中位数', type: 'line', data: peSeries },
    { name: 'PB中位数', type: 'line', data: pbSeries },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">PE / PB 趋势</Typography>

          <ToggleButtonGroup
            exclusive
            value={period}
            size="small"
            onChange={(_, v) => {
              if (v) setPeriod(v);
            }}
          >
            {PERIODS.map((p) => (
              <ToggleButton key={p.value} value={p.value}>
                {p.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Skeleton variant="rectangular" height={300} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 300 }} />
        )}
      </CardContent>
    </Card>
  );
}
