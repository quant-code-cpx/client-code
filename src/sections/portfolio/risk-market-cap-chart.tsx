import type { MarketCapDistribution } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { getRiskMarketCap } from 'src/api/portfolio';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

interface RiskMarketCapChartProps {
  portfolioId: string;
}

export function RiskMarketCapChart({ portfolioId }: RiskMarketCapChartProps) {
  const [data, setData] = useState<MarketCapDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRiskMarketCap({ portfolioId });
      setData(res);
    } catch {
      setError('加载市值分布失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buckets = data?.buckets ?? [];
  const categories = buckets.map((b) => b.label);
  const seriesData = buckets.map((b) => Number(((b.weight ?? 0) * 100).toFixed(2)));

  const chartOptions = useChart({
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: '50%', distributed: true } },
    dataLabels: { enabled: false },
    xaxis: { categories },
    yaxis: { labels: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    tooltip: { y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
    legend: { show: false },
  });

  const series = [{ name: '权重', data: seriesData }];

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          市值分布
        </Typography>

        {loading && <Skeleton variant="rectangular" height={280} />}
        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && (
          <>
            {buckets.length === 0 ? (
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  暂无数据
                </Typography>
              </Box>
            ) : (
              <Chart type="bar" series={series} options={chartOptions} sx={{ height: 280 }} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
