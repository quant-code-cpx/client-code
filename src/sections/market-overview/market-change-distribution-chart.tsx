import type { ChangeDistributionResult } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchChangeDistribution } from 'src/api/market';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function MarketChangeDistributionChart({ tradeDate }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<ChangeDistributionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchChangeDistribution({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载涨跌幅分布失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  const distribution = data?.distribution ?? [];

  // Build bar colors: red for positive intervals, green for negative
  const barColors = distribution.map((d) => {
    // Negative-only intervals (e.g. "-9~-8", "-1~0") → green (跌)
    if (/^-\d/.test(d.label)) return theme.palette.success.main;
    // Zero-crossing interval "0~1" or near-zero → neutral
    if (d.label === '0~1') return theme.palette.text.disabled;
    return theme.palette.error.main;
  });

  const chartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: {
      bar: {
        distributed: true,
        borderRadius: 2,
        columnWidth: '90%',
      },
    },
    colors: barColors.length > 0 ? barColors : [theme.palette.primary.main],
    legend: { show: false },
    xaxis: {
      categories: distribution.map((d) => d.label),
      labels: { rotate: -45, rotateAlways: false, style: { fontSize: '10px' } },
    },
    tooltip: { shared: false, intersect: true },
  });

  const series = [{ name: '家数', data: distribution.map((d) => d.count) }];

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">涨跌幅分布</Typography>

          {data != null && (
            <Stack direction="row" spacing={2}>
              <Typography variant="caption" sx={{ color: 'error.main' }}>
                涨停&nbsp;{data.limitUp ?? 0}&nbsp;家
              </Typography>
              <Typography variant="caption" sx={{ color: 'success.main' }}>
                跌停&nbsp;{data.limitDown ?? 0}&nbsp;家
              </Typography>
            </Stack>
          )}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Skeleton variant="rectangular" height={280} />
        ) : distribution.length === 0 ? (
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
