import type { MoneyFlowTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchMoneyFlowTrend } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

const DAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 10, label: '10日' },
  { value: 20, label: '20日' },
  { value: 40, label: '40日' },
  { value: 60, label: '60日' },
];

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

/** 万元 → 亿元 */
function toYi(wan: number): number {
  return +(wan / 10000).toFixed(2);
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function CapitalFlowTrendChart({ tradeDate }: Props) {
  const [days, setDays] = useState(20);
  const [data, setData] = useState<MoneyFlowTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMoneyFlowTrend({ trade_date: tradeDate, days })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载大盘资金流趋势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate, days]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const dailyNet = data.map((d) => toYi(d.netAmount));
  const cumulativeNet = data.map((d) => toYi(d.cumulativeNet));

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '60%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: 0, color: '#00B746' },
            { from: 0, to: 9999999, color: '#FF4560' },
          ],
        },
      },
    },
    xaxis: {
      categories,
      labels: { rotate: -30 },
    },
    yaxis: [
      {
        title: { text: '每日净流入(亿)' },
        labels: {
          formatter: (v: number) => `${v.toFixed(0)}亿`,
        },
      },
      {
        opposite: true,
        title: { text: '累计净流入(亿)' },
        labels: {
          formatter: (v: number) => `${v.toFixed(0)}亿`,
        },
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
  });

  const series = [
    { name: '每日净流入', type: 'column', data: dailyNet },
    { name: '累计净流入', type: 'line', data: cumulativeNet },
  ];

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <Typography variant="h6">大盘资金流向趋势</Typography>

          <ToggleButtonGroup
            exclusive
            value={days}
            size="small"
            onChange={(_, v) => {
              if (v != null) setDays(v);
            }}
          >
            {DAY_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Skeleton variant="rectangular" height={320} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 320,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 320 }} />
        )}
      </CardContent>
    </Card>
  );
}
