import type { VolumeOverviewItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchVolumeOverview } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

/** 将千元单位转为亿元 */
function toYi(v: number): number {
  return +(v / 100000).toFixed(2);
}

/** 简单 N 日 SMA */
function sma(arr: number[], n: number): (number | null)[] {
  return arr.map((_, i) => {
    if (i < n - 1) return null;
    const slice = arr.slice(i - n + 1, i + 1);
    return +(slice.reduce((s, x) => s + x, 0) / n).toFixed(2);
  });
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketVolumeChart({ tradeDate }: Props) {
  const [data, setData] = useState<VolumeOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchVolumeOverview({ trade_date: tradeDate, days: 60 })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载市场成交额失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const amounts = data.map((d) => toYi(d.totalAmount));
  const ma20 = sma(amounts, 20);

  const chartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: { bar: { columnWidth: '60%', borderRadius: 2 } },
    xaxis: { categories, labels: { rotate: -30 } },
    yaxis: {
      labels: {
        formatter: (v: number | null) => (v != null ? `${v.toFixed(0)}亿` : ''),
      },
    },
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
    stroke: { width: [0, 2] },
  });

  const series = [
    { name: '全A成交额(亿)', type: 'bar', data: amounts },
    { name: '20日均额(亿)', type: 'line', data: ma20 },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          市场成交额
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 280,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">暂无数据</Typography>
          </Box>
        ) : (
          <Chart type="bar" series={series} options={chartOptions} sx={{ height: 280 }} />
        )}
      </CardContent>
    </Card>
  );
}
