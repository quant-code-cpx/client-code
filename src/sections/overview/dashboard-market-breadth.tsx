import type { SentimentResult, ChangeDistributionResult } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchSentiment, fetchChangeDistribution } from 'src/api/market';

import { Label } from 'src/components/label';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function DashboardMarketBreadth() {
  const theme = useTheme();

  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [distribution, setDistribution] = useState<ChangeDistributionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.allSettled([fetchSentiment(), fetchChangeDistribution()]).then(([sRes, dRes]) => {
      if (cancelled) return;

      if (sRes.status === 'fulfilled') setSentiment(sRes.value);
      if (dRes.status === 'fulfilled') setDistribution(dRes.value);

      if (sRes.status === 'rejected' && dRes.status === 'rejected') {
        setError('加载市场广度数据失败');
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Sentiment ──
  const riseCount = sentiment ? (sentiment.bigRise ?? 0) + (sentiment.rise ?? 0) : 0;
  const fallCount = sentiment ? (sentiment.bigFall ?? 0) + (sentiment.fall ?? 0) : 0;
  const flatCount = sentiment?.flat ?? 0;
  const total = riseCount + fallCount + flatCount;
  const riseP = total > 0 ? Math.round((riseCount / total) * 100) : 0;
  const flatP = total > 0 ? Math.round((flatCount / total) * 100) : 0;
  const fallP = total > 0 ? 100 - riseP - flatP : 0;

  // ── Distribution chart ──
  const bars = distribution?.distribution ?? [];

  const barColors = bars.map((d) => {
    if (d.label.startsWith('<') && d.label.includes('-')) return theme.palette.success.main;
    if (/^-\d/.test(d.label)) return theme.palette.success.main;
    if (d.label === '0~1') return theme.palette.text.disabled;
    return theme.palette.error.main;
  });

  const chartOpts = useChart({
    chart: { type: 'bar', selection: { enabled: false } },
    plotOptions: { bar: { distributed: true, borderRadius: 2, columnWidth: '85%' } },
    colors: barColors.length > 0 ? barColors : [theme.palette.primary.main],
    legend: { show: false },
    xaxis: {
      categories: bars.map((d) => d.label),
      labels: { rotate: -45, style: { fontSize: '12px' } },
    },
    tooltip: { shared: false, intersect: false },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          市场广度
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="rectangular" height={56} />
            <Skeleton variant="rectangular" height={10} />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={200} />
          </Stack>
        ) : (
          <>
            {/* ── Sentiment numbers ── */}
            {sentiment && (
              <>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      fontWeight="fontWeightBold"
                      sx={{ color: 'error.main', lineHeight: 1 }}
                    >
                      {riseCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      上涨
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      fontWeight="fontWeightBold"
                      sx={{ color: 'text.disabled', lineHeight: 1 }}
                    >
                      {flatCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      平盘
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      fontWeight="fontWeightBold"
                      sx={{ color: 'success.main', lineHeight: 1 }}
                    >
                      {fallCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      下跌
                    </Typography>
                  </Box>
                </Stack>

                {/* Stacked breadth bar */}
                <Box
                  sx={{
                    display: 'flex',
                    height: 10,
                    borderRadius: 1,
                    overflow: 'hidden',
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: `${riseP}%`,
                      bgcolor: 'error.main',
                      transition: 'width 0.5s ease',
                    }}
                  />
                  <Box
                    sx={{
                      width: `${flatP}%`,
                      bgcolor: 'text.disabled',
                      transition: 'width 0.5s ease',
                    }}
                  />
                  <Box
                    sx={{
                      width: `${fallP}%`,
                      bgcolor: 'success.main',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </Box>

                {/* Limit badges */}
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Label color="error" variant="soft">
                    涨停 {distribution?.limitUp ?? sentiment.bigRise ?? 0}
                  </Label>
                  <Label color="success" variant="soft">
                    跌停 {distribution?.limitDown ?? sentiment.bigFall ?? 0}
                  </Label>
                </Stack>
              </>
            )}

            {/* ── Distribution chart ── */}
            {bars.length > 0 && (
              <>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                  涨跌幅分布
                </Typography>
                <Chart
                  type="bar"
                  series={[{ name: '家数', data: bars.map((d) => d.count) }]}
                  options={chartOpts}
                  sx={{ height: 200, '& svg': { outline: 'none' } }}
                />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
