import type { SentimentTrendItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchSentimentTrend } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function fmtDate(d: string): string {
  if (!d) return d;
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (d.includes('T')) return d.slice(0, 10);
  return d;
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketSentimentTrendChart({ tradeDate }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<SentimentTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSentimentTrend({ trade_date: tradeDate, days: 60 })
      .then((res) => {
        if (!cancelled) setData(res?.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载涨跌家数趋势失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  const categories = data.map((d) => fmtDate(d.tradeDate));

  const chartOptions = useChart({
    chart: { type: 'area' },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', opacity: 0.3 },
    colors: [theme.palette.error.main, theme.palette.success.main],
    xaxis: { categories, labels: { rotate: -30 } },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(0) } },
    tooltip: { shared: true, intersect: false },
    legend: { show: true },
  });

  const series = [
    { name: '上涨家数', data: data.map((d) => d.rise) },
    { name: '下跌家数', data: data.map((d) => d.fall) },
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          涨跌家数趋势
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
          <Chart type="area" series={series} options={chartOptions} sx={{ height: 280 }} />
        )}
      </CardContent>
    </Card>
  );
}
