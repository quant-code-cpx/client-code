import type { StockShareCapitalData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fWanYuan } from 'src/utils/format-number';

import { stockDetailApiExtra } from 'src/api/stock';

import { Iconify } from 'src/components/iconify';
import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

type StatCardProps = { label: string; value: string };

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = { tsCode: string };

export function StockDetailShareCapitalTab({ tsCode }: Props) {
  const [data, setData] = useState<StockShareCapitalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApiExtra.shareCapital(tsCode);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取股本结构数据失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const latest = data?.latest;

  const pieOptions = useChart({
    chart: { type: 'donut' },
    labels: ['流通股本', '限售股份'],
    legend: { position: 'bottom' },
    tooltip: { y: { formatter: (v: number) => fWanYuan(v) + ' 万股' } },
  });

  const pieSeries = latest ? [latest.floatShare ?? 0, latest.restrictedShare ?? 0] : [];

  if (loading) {
    return (
      <Stack spacing={2}>
        <Grid container spacing={2}>
          {[...Array(6)].map((_, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
              <Skeleton variant="rectangular" height={72} sx={{ borderRadius: 1.5 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 1.5 }} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const fmt = (v: number | null | undefined) => (v != null ? fWanYuan(v) + ' 万' : '-');

  return (
    <Stack spacing={3}>
      {/* 最新股本统计卡片 */}
      {latest && (
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label="总股本" value={fmt(latest.totalShare)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label="流通股本" value={fmt(latest.floatShare)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label="自由流通" value={fmt(latest.freeShare)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label="限售股份" value={fmt(latest.restrictedShare)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label="总市值" value={fmt(latest.totalMv)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard label="流通市值" value={fmt(latest.circMv)} />
          </Grid>
        </Grid>
      )}

      {/* 股本结构饼图 */}
      {latest && (latest.floatShare != null || latest.restrictedShare != null) && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              股本结构
            </Typography>
            <Box sx={{ maxWidth: 360, mx: 'auto' }}>
              <Chart type="donut" series={pieSeries} options={pieOptions} sx={{ height: 280 }} />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* 股本变动历史 */}
      {data && data.changes.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              股本变动记录
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>公告日期</TableCell>
                    <TableCell>变动原因</TableCell>
                    <TableCell align="right">变动前总股本（万）</TableCell>
                    <TableCell align="right">变动后总股本（万）</TableCell>
                    <TableCell align="right">变动量（万）</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.changes.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {row.annDate ?? '-'}
                      </TableCell>
                      <TableCell>{row.changeReason ?? '-'}</TableCell>
                      <TableCell align="right">
                        {row.totalShareBefore != null ? fWanYuan(row.totalShareBefore) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.totalShareAfter != null ? fWanYuan(row.totalShareAfter) : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {row.changeAmount != null ? (
                          <Box
                            component="span"
                            sx={{
                              color: row.changeAmount > 0 ? 'error.main' : 'success.main',
                            }}
                          >
                            {row.changeAmount > 0 ? '+' : ''}
                            {fWanYuan(row.changeAmount)}
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 历史股本（可折叠） */}
      {data && data.history.length > 0 && (
        <Card>
          <CardContent>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: historyExpanded ? 2 : 0, cursor: 'pointer' }}
              onClick={() => setHistoryExpanded((p) => !p)}
            >
              <Typography variant="subtitle1">历史股本明细</Typography>
              <IconButton size="small">
                <Iconify
                  icon={historyExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                  width={18}
                />
              </IconButton>
            </Stack>
            <Collapse in={historyExpanded}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>日期</TableCell>
                      <TableCell align="right">总股本（万）</TableCell>
                      <TableCell align="right">流通股本（万）</TableCell>
                      <TableCell align="right">自由流通（万）</TableCell>
                      <TableCell align="right">限售股（万）</TableCell>
                      <TableCell align="right">总市值（万）</TableCell>
                      <TableCell align="right">流通市值（万）</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.history.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {row.endDate}
                        </TableCell>
                        <TableCell align="right">
                          {row.totalShare != null ? fWanYuan(row.totalShare) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {row.floatShare != null ? fWanYuan(row.floatShare) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {row.freeShare != null ? fWanYuan(row.freeShare) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {row.restrictedShare != null ? fWanYuan(row.restrictedShare) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {row.totalMv != null ? fWanYuan(row.totalMv) : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {row.circMv != null ? fWanYuan(row.circMv) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </CardContent>
        </Card>
      )}

      {!data && !loading && <Alert severity="info">暂无股本结构数据</Alert>}
    </Stack>
  );
}
