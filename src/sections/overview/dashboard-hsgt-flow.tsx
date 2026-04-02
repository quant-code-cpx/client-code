import type { HsgtTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchHsgtFlow } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

/** 百万元 → 亿元 */
function toYi(v: number): number {
  return +(v / 100).toFixed(2);
}

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(5, 10);
  return d.slice(5, 10);
}

// ----------------------------------------------------------------------

export function DashboardHsgtFlow() {
  const [data, setData] = useState<HsgtTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchHsgtFlow({ days: 30 })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载北向资金失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = data.map((d) => fmtDate(d.tradeDate));
  const dailyValues = data.map((d) => toYi(d.northMoney));
  const cumulativeValues = data.map((d) => toYi(d.cumulativeNorth));

  const chartOptions = useChart({
    chart: { type: 'line', stacked: false },
    stroke: { width: [0, 2], curve: 'smooth' },
    plotOptions: {
      bar: {
        columnWidth: '70%',
        borderRadius: 2,
        colors: {
          ranges: [
            { from: -9999999, to: 0, color: '#00B746' },
            { from: 0, to: 9999999, color: '#FF4560' },
          ],
        },
      },
    },
    xaxis: { categories, labels: { rotate: -30, style: { fontSize: '10px' } } },
    yaxis: [
      {
        title: { text: '每日净买(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}` },
      },
      {
        opposite: true,
        title: { text: '累计(亿)' },
        labels: { formatter: (v: number) => `${v.toFixed(0)}` },
      },
    ],
    tooltip: { shared: true, intersect: false },
    legend: { show: true, position: 'top' },
  });

  const series = [
    { name: '每日净买入', type: 'bar', data: dailyValues },
    { name: '累计净买入', type: 'line', data: cumulativeValues },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          北向资金（近30日）
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Skeleton variant="rectangular" height={220} />
        ) : data.length === 0 ? (
          <Box
            sx={{
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              暂无数据
            </Typography>
          </Box>
        ) : (
          <Chart type="line" series={series} options={chartOptions} sx={{ height: 220 }} />
        )}
      </CardContent>
    </Card>
  );
}
