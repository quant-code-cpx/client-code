import type { IndustryDistribution } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { getRiskIndustry } from 'src/api/portfolio';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

interface RiskIndustryChartProps {
  portfolioId: string;
}

export function RiskIndustryChart({ portfolioId }: RiskIndustryChartProps) {
  const [data, setData] = useState<IndustryDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getRiskIndustry({ portfolioId });
      setData(res);
    } catch {
      setError('加载行业分布失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const industries = data?.industries ?? [];
  const weightedIndustries = industries.filter(
    (item): item is typeof item & { weight: number } => item.weight !== null
  );
  const chartLabels = weightedIndustries.map((item) => item.industry);
  const chartSeries = weightedIndustries.map((item) => Number((item.weight * 100).toFixed(2)));

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    labels: chartLabels,
    stroke: { width: 0 },
    dataLabels: { enabled: true, dropShadow: { enabled: false } },
    tooltip: {
      y: { formatter: (v: number) => `${v.toFixed(2)}%` },
    },
    plotOptions: { pie: { donut: { labels: { show: false } } } },
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
          行业分布
        </Typography>

        {loading && <Skeleton variant="rectangular" height={280} />}
        {!loading && error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void fetchData()}>
                重试
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <>
            {industries.length === 0 ? (
              <Box
                sx={{
                  height: 280,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  暂无数据
                </Typography>
              </Box>
            ) : (
              <>
                {chartSeries.length > 0 ? (
                  <Chart
                    type="donut"
                    series={chartSeries}
                    options={chartOptions}
                    sx={{ my: 4, mx: 'auto', width: { xs: 240 }, height: { xs: 240 } }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ my: 4 }}>
                    暂无可用权重数据
                  </Typography>
                )}
                <Table size="small" sx={{ mt: 2 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>行业</TableCell>
                      <TableCell align="right">股票数</TableCell>
                      <TableCell align="right">权重</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {industries.map((item) => (
                      <TableRow key={item.industry}>
                        <TableCell>{item.industry}</TableCell>
                        <TableCell align="right">{item.stockCount}</TableCell>
                        <TableCell align="right">
                          {item.weight === null ? '-' : `${(item.weight * 100).toFixed(2)}%`}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
