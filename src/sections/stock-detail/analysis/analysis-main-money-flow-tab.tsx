import type { StockMainMoneyFlowData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { stockDetailApiExtra } from 'src/api/stock';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type StatCardProps = { label: string; value: string | null; positive?: boolean };

function StatCard({ label, value, positive }: StatCardProps) {
  const color = positive == null ? 'text.primary' : positive ? 'error.main' : 'success.main';
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color, mt: 0.5 }}>
          {value ?? '-'}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = { tsCode: string };

export function AnalysisMainMoneyFlowTab({ tsCode }: Props) {
  const [data, setData] = useState<StockMainMoneyFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApiExtra.mainMoneyFlow(tsCode, 60);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取主力资金流向失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const chartOptions = useChart({
    xaxis: {
      categories: data?.history.map((d) => d.tradeDate) ?? [],
      labels: { rotate: -30, style: { fontSize: '11px' } },
    },
    yaxis: [
      {
        seriesName: '收盘价',
        title: { text: '收盘价' },
        labels: { formatter: (v: number) => v.toFixed(2) },
      },
      {
        opposite: true,
        seriesName: '主力净流入',
        title: { text: '净流入（万元）' },
        labels: { formatter: (v: number) => fWanYuan(v) },
      },
    ],
    plotOptions: {
      bar: {
        columnWidth: '60%',
        colors: {
          ranges: [
            { from: -Infinity, to: 0, color: '#00A76F' },
            { from: 0, to: Infinity, color: '#FF5630' },
          ],
        },
      },
    },
    stroke: { curve: 'smooth', width: [2, 0] },
    tooltip: {
      y: [
        { formatter: (v: number) => v.toFixed(2) },
        { formatter: (v: number) => fWanYuan(v) + ' 万' },
      ],
    },
  });

  const chartSeries = [
    {
      name: '收盘价',
      type: 'line',
      data: data?.history.map((d) => d.close ?? null) ?? [],
    },
    {
      name: '主力净流入',
      type: 'bar',
      data: data?.history.map((d) => d.mainNetInflow ?? null) ?? [],
    },
  ];

  const summary = data?.summary;

  if (loading) {
    return (
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {[...Array(5)].map((_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 1.5 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1.5 }} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Stack spacing={3}>
      {/* 汇总统计 */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard
            label="5日主力净流入"
            value={
              summary?.mainNetInflow5d != null ? fWanYuan(summary.mainNetInflow5d) + ' 万' : null
            }
            positive={summary?.mainNetInflow5d != null ? summary.mainNetInflow5d > 0 : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard
            label="10日主力净流入"
            value={
              summary?.mainNetInflow10d != null ? fWanYuan(summary.mainNetInflow10d) + ' 万' : null
            }
            positive={summary?.mainNetInflow10d != null ? summary.mainNetInflow10d > 0 : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard
            label="20日主力净流入"
            value={
              summary?.mainNetInflow20d != null ? fWanYuan(summary.mainNetInflow20d) + ' 万' : null
            }
            positive={summary?.mainNetInflow20d != null ? summary.mainNetInflow20d > 0 : undefined}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard label="主力控盘度" value={summary?.controlDegree ?? null} />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
          <StatCard label="趋势判断" value={summary?.trend ?? null} />
        </Grid>
      </Grid>

      {/* 趋势图 */}
      {data && data.history.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              主力资金流向趋势
            </Typography>
            <Chart type="line" series={chartSeries} options={chartOptions} sx={{ height: 320 }} />
          </CardContent>
        </Card>
      )}

      {/* 明细表格 */}
      {data && data.history.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              历史明细
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>日期</TableCell>
                    <TableCell align="right">收盘价</TableCell>
                    <TableCell align="right">涨跌幅</TableCell>
                    <TableCell align="right">主力净流入（万）</TableCell>
                    <TableCell align="right">超大单净流入（万）</TableCell>
                    <TableCell align="right">大单净流入（万）</TableCell>
                    <TableCell align="right">主力占比</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...data.history].reverse().map((row) => (
                    <TableRow key={row.tradeDate} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {row.tradeDate}
                      </TableCell>
                      <TableCell align="right">
                        {row.close != null ? row.close.toFixed(2) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.pctChg != null ? (
                          <Box
                            component="span"
                            sx={{
                              color:
                                row.pctChg > 0
                                  ? 'error.main'
                                  : row.pctChg < 0
                                    ? 'success.main'
                                    : 'text.secondary',
                            }}
                          >
                            {fPctChg(row.pctChg)}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {row.mainNetInflow != null ? (
                          <Box
                            component="span"
                            sx={{ color: row.mainNetInflow > 0 ? 'error.main' : 'success.main' }}
                          >
                            {fWanYuan(row.mainNetInflow)}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {row.superLargeNetInflow != null ? fWanYuan(row.superLargeNetInflow) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.largeNetInflow != null ? fWanYuan(row.largeNetInflow) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.mainNetInflowRate != null
                          ? `${row.mainNetInflowRate.toFixed(2)}%`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {!data && !loading && <Alert severity="info">暂无主力资金流向数据</Alert>}
    </Stack>
  );
}
