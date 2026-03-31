import type { SentimentResult } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchSentiment } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketSentimentCard({ tradeDate }: Props) {
  const [data, setData] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSentiment({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载市场情绪失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  const riseTotal = data != null ? (data.bigRise ?? 0) + (data.rise ?? 0) : 0;
  const fallTotal = data != null ? (data.bigFall ?? 0) + (data.fall ?? 0) : 0;

  const chartSeries = data != null
    ? [
        {
          name: '市场情绪',
          data: [
            data.bigRise ?? 0,
            data.rise ?? 0,
            data.flat ?? 0,
            data.fall ?? 0,
            data.bigFall ?? 0,
          ],
        },
      ]
    : [];

  const chartOptions = useChart({
    chart: { type: 'bar', stacked: true },
    plotOptions: {
      bar: {
        horizontal: true,
        distributed: true,
        borderRadius: 3,
        dataLabels: { position: 'center' },
      },
    },
    colors: ['#d32f2f', '#ef5350', '#9e9e9e', '#66bb6a', '#388e3c'],
    xaxis: { categories: ['涨≥5%', '涨0~5%', '平盘', '跌0~5%', '跌≥5%'] },
    legend: { show: false },
    dataLabels: { enabled: true, style: { colors: ['#fff'] } },
    tooltip: { shared: false, intersect: true },
  });

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          市场情绪
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <>
            <Skeleton variant="text" width="60%" height={40} />
            <Skeleton variant="text" width="50%" height={40} />
            <Skeleton variant="rectangular" height={160} sx={{ mt: 2 }} />
          </>
        ) : (
          <>
            <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 'fontWeightBold' }}>
                  {riseTotal}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  上涨家数
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="h4"
                  sx={{ color: 'success.main', fontWeight: 'fontWeightBold' }}
                >
                  {fallTotal}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  下跌家数
                </Typography>
              </Box>
              {data != null && (
                <Box>
                  <Typography variant="h4" sx={{ color: 'text.secondary', fontWeight: 'fontWeightBold' }}>
                    {data.flat ?? 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    平盘
                  </Typography>
                </Box>
              )}
            </Stack>

            {data != null && (
              <Chart type="bar" series={chartSeries} options={chartOptions} sx={{ height: 200 }} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
