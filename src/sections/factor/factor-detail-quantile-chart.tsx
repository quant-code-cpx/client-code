import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { Chart, useChart } from 'src/components/chart';
import { factorApi } from 'src/api/factor';
import type { FactorQuantileResult } from 'src/api/factor';

// ----------------------------------------------------------------------

type AnalysisParams = {
  startDate: string;
  endDate: string;
  universe?: string;
};

type FactorDetailQuantileChartProps = {
  factorName: string;
  params: AnalysisParams;
};

// ----------------------------------------------------------------------

export function FactorDetailQuantileChart({ factorName, params }: FactorDetailQuantileChartProps) {
  const theme = useTheme();
  const [result, setResult] = useState<FactorQuantileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!factorName) return;
    setLoading(true);
    setError('');
    try {
      const data = await factorApi.quantile({
        factorName,
        startDate: params.startDate,
        endDate: params.endDate,
        universe: params.universe,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分层回测失败');
    } finally {
      setLoading(false);
    }
  }, [factorName, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const quantileColors = [
    theme.palette.success.dark,
    theme.palette.success.light,
    theme.palette.warning.main,
    theme.palette.error.light,
    theme.palette.error.dark,
  ];

  const lineSeries = result
    ? [
        ...result.groups.map((g) => ({
          name: g.label,
          data: g.series.map((d) => ({ x: d.tradeDate, y: Number((d.cumReturn * 100).toFixed(2)) })),
        })),
        {
          name: '多空组合',
          data: result.longShort.series.map((d) => ({
            x: d.tradeDate,
            y: Number((d.cumReturn * 100).toFixed(2)),
          })),
        },
        {
          name: '基准',
          data: result.benchmark.series.map((d) => ({
            x: d.tradeDate,
            y: Number((d.cumReturn * 100).toFixed(2)),
          })),
        },
      ]
    : [];

  const lineChartOptions = useChart({
    chart: { type: 'line', zoom: { enabled: true }, toolbar: { show: true } },
    stroke: {
      width: result
        ? [...result.groups.map(() => 2), 3, 2]
        : [2],
      dashArray: result
        ? [...result.groups.map(() => 0), 0, 4]
        : [0],
    },
    colors: result
      ? [
          ...quantileColors.slice(0, result.groups.length),
          '#111827',
          theme.palette.text.disabled,
        ]
      : [],
    xaxis: { type: 'category' },
    yaxis: { labels: { formatter: (v: number) => `${v.toFixed(1)}%` } },
    dataLabels: { enabled: false },
    legend: { show: true },
    tooltip: { shared: false, y: { formatter: (v: number) => `${v.toFixed(2)}%` } },
  });

  const barSeries = result
    ? [
        {
          name: '年化收益',
          data: result.groups.map((g) => Number((g.annualizedReturn * 100).toFixed(2))),
        },
      ]
    : [];

  const barChartOptions = useChart({
    chart: { type: 'bar' },
    plotOptions: {
      bar: {
        colors: {
          ranges: [
            { from: -100, to: 0, color: theme.palette.error.main },
            { from: 0, to: 100, color: theme.palette.success.main },
          ],
        },
      },
    },
    xaxis: { categories: result?.groups.map((g) => g.group) ?? [] },
    yaxis: { labels: { formatter: (v: number) => `${v}%` } },
    dataLabels: { enabled: true, formatter: (v: number) => `${Number(v).toFixed(1)}%` },
    legend: { show: false },
  });

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!result) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="body2" color="text.secondary">
          请设置参数后点击"开始分析"
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 统计表格 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="各组统计" subheader={`分 ${result.quantiles} 组 · 调仓周期 ${result.rebalanceDays} 日`} />
        <CardContent sx={{ pt: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>分组</TableCell>
                  <TableCell align="right">年化收益</TableCell>
                  <TableCell align="right">最大回撤</TableCell>
                  <TableCell align="right">夏普比率</TableCell>
                  <TableCell align="right">总收益</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.groups.map((g) => (
                  <TableRow key={g.group} hover={true}>
                    <TableCell>{g.label}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: g.annualizedReturn >= 0 ? 'success.main' : 'error.main' }}
                    >
                      {(g.annualizedReturn * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell align="right" sx={{ color: 'error.main' }}>
                      {(g.maxDrawdown * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell align="right">{g.sharpeRatio.toFixed(3)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: g.totalReturn >= 0 ? 'success.main' : 'error.main' }}
                    >
                      {(g.totalReturn * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* 累计收益曲线 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="分层累计收益曲线" />
        <CardContent>
          <Chart type="line" series={lineSeries} options={lineChartOptions} sx={{ height: 360 }} />
        </CardContent>
      </Card>

      {/* 年化收益柱状图 */}
      <Card>
        <CardHeader title="各组年化收益" />
        <CardContent>
          <Chart type="bar" series={barSeries} options={barChartOptions} sx={{ height: 240 }} />
        </CardContent>
      </Card>
    </Box>
  );
}
