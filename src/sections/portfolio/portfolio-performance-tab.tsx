import type { PortfolioPerformanceResponse } from 'src/api/portfolio';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { getPerformance } from 'src/api/portfolio';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

function toApiDate(yyyymmdd: string) {
  return yyyymmdd.replace(/-/g, '');
}

function defaultStartDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

function fPct(v: number | null | undefined) {
  if (v == null) return '--';
  return `${(v * 100).toFixed(2)}%`;
}

function f2(v: number | null | undefined) {
  if (v == null) return '--';
  return v.toFixed(4);
}

// ----------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

interface PortfolioPerformanceTabProps {
  portfolioId: string;
}

export function PortfolioPerformanceTab({ portfolioId }: PortfolioPerformanceTabProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [benchmark, setBenchmark] = useState('000300.SH');
  const [data, setData] = useState<PortfolioPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPerformance({
        portfolioId,
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate),
        benchmarkTsCode: benchmark || undefined,
      });
      setData(res);
    } catch {
      setError('加载业绩数据失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, startDate, endDate, benchmark]);

  const m = data?.metrics;
  const categories = data?.series.map((s) => s.date) ?? [];
  const navData = data?.series.map((s) => Number(s.portfolioNav.toFixed(4))) ?? [];
  const bchData = data?.series.map((s) => Number(s.benchmarkNav.toFixed(4))) ?? [];

  const chartOptions = useChart({
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { width: [2, 2], curve: 'smooth' },
    dataLabels: { enabled: false },
    xaxis: { type: 'category', categories, tickAmount: 8 },
    yaxis: { labels: { formatter: (v: number) => v.toFixed(4) } },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => v.toFixed(4) },
    },
    legend: { show: true },
  });

  const series = [
    { name: '组合净值', data: navData },
    { name: `基准净值 (${data?.benchmarkTsCode ?? benchmark})`, data: bchData },
  ];

  const metrics = [
    { label: '总收益率', value: fPct(m?.totalReturn) },
    { label: '年化收益率', value: fPct(m?.annualizedReturn) },
    { label: '基准收益率', value: fPct(m?.benchmarkReturn) },
    { label: '超额收益', value: fPct(m?.excessReturn) },
    { label: '跟踪误差', value: fPct(m?.trackingError) },
    { label: '信息比率', value: f2(m?.informationRatio) },
    { label: '夏普比率', value: f2(m?.sharpeRatio) },
    { label: '最大回撤', value: fPct(m?.maxDrawdown) },
  ];

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="开始日期"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="结束日期"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="基准代码"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              size="small"
              placeholder="000300.SH"
            />
            <Button variant="outlined" onClick={fetchData} disabled={loading}>
              查询
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 2 }} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}
      {!loading && data && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {metrics.map(({ label, value }) => (
              <Grid key={label} size={{ xs: 6, sm: 4, md: 3 }}>
                <MetricCard label={label} value={value} />
              </Grid>
            ))}
          </Grid>

          {data.series.length > 0 ? (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                  净值走势对比
                </Typography>
                <Chart type="line" series={series} options={chartOptions} sx={{ height: 320 }} />
              </CardContent>
            </Card>
          ) : (
            <Alert severity="info">所选日期范围内暂无业绩数据</Alert>
          )}
        </>
      )}
    </Box>
  );
}
