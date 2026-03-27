import type { StockShareholdersData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';

import { fNumber } from 'src/utils/format-number';

import { stockDetailApi } from 'src/api/stock';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

function str(v: unknown): string {
  return v != null && v !== '' ? String(v) : '-';
}

function num(v: unknown): string {
  const n = Number(v);
  return Number.isNaN(n) ? '-' : fNumber(n);
}

// ----------------------------------------------------------------------

export function StockDetailDividendTab({ tsCode }: Props) {
  const [data, setData] = useState<StockShareholdersData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.shareholders(tsCode);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取分红数据失败');
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
        <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1.5 }} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const dividendHistory = (data?.dividendHistory ?? []) as Record<string, unknown>[];

  return (
    <Stack spacing={3}>
      {/* 分红历史 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6">分红历史</Typography>
            <Chip label={`共 ${dividendHistory.length} 条`} size="small" variant="outlined" />
          </Box>

          {dividendHistory.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">暂无分红记录</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>公告日期</TableCell>
                    <TableCell>股权登记日</TableCell>
                    <TableCell>除权除息日</TableCell>
                    <TableCell align="right">每股股利(元)</TableCell>
                    <TableCell align="right">每股转增(股)</TableCell>
                    <TableCell align="right">每股送股(股)</TableCell>
                    <TableCell>实施方案</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dividendHistory.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{str(row.annDate ?? row.announceDate)}</TableCell>
                      <TableCell>{str(row.recordDate ?? row.stkhDate)}</TableCell>
                      <TableCell>{str(row.exDate ?? row.exdivDate)}</TableCell>
                      <TableCell align="right">
                        {num(row.cashDiv ?? row.cashDivTax ?? row.divPerShare)}
                      </TableCell>
                      <TableCell align="right">
                        {num(row.stkhBonus ?? row.capitalizeShareBonus)}
                      </TableCell>
                      <TableCell align="right">{num(row.stkhRation ?? row.giveSh)}</TableCell>
                      <TableCell>
                        <Chip
                          label={str(row.divProceStatus ?? row.impStatus ?? row.divProcStatus)}
                          size="small"
                          variant="outlined"
                          color={
                            String(row.impStatus ?? row.divProcStatus ?? '').includes('实施')
                              ? 'success'
                              : 'default'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 融资记录说明 */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            融资记录
          </Typography>
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">
              融资历史（增发、配股、可转债等）接口待开发
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
