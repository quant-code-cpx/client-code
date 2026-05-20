import type { FundHoldingItem } from 'src/api/fund';

import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fDate } from 'src/utils/format-time';
import { fNumber } from 'src/utils/format-number';

import { fetchInstitutionalHoldings } from 'src/api/fund';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

export function AnalysisInstitutionalTab({ tsCode }: Props) {
  const [data, setData] = useState<FundHoldingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchInstitutionalHoldings(tsCode);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取机构持仓数据失败');
    } finally {
      setLoading(false);
    }
  }, [tsCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 1.5 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1.5 }} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const fundCount = new Set(data.map((d) => d.fundCode)).size;
  const totalMv = data.reduce((sum, d) => sum + d.marketValue, 0);

  return (
    <Stack spacing={3}>
      {/* ── 概览卡片 ── */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, sm: 4 }}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: 'primary.main' }}>
              {fundCount}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              持有基金数
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4 }}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: 'info.main' }}>
              {fNumber(Math.round(totalMv))}万
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              总持仓市值
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" sx={{ color: 'text.primary' }}>
              {data.length}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              持仓记录数
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* ── 持仓明细表 ── */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            基金持仓明细
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>基金名称</TableCell>
                  <TableCell align="right">持仓市值(万)</TableCell>
                  <TableCell align="right">占净值比</TableCell>
                  <TableCell align="right">持股数(万股)</TableCell>
                  <TableCell>报告期</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">暂无机构持仓数据</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((row, idx) => (
                    <TableRow key={`${row.fundCode}-${idx}`}>
                      <TableCell>
                        <Typography variant="subtitle2">{row.fundName}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {row.fundCode}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fNumber(Math.round(row.marketValue))}</TableCell>
                      <TableCell align="right">{(row.navPercent * 100).toFixed(2)}%</TableCell>
                      <TableCell align="right">{fNumber(row.holdVolume)}</TableCell>
                      <TableCell>{fDate(row.endDate, 'YYYY-MM-DD')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Stack>
  );
}
