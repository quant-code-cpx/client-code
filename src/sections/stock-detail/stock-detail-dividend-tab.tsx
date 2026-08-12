import type { StockFinancingData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
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

function date(v: unknown): string {
  if (!v) return '-';
  return String(v).slice(0, 10);
}

// ----------------------------------------------------------------------

export function StockDetailDividendTab({ tsCode }: Props) {
  const [finData, setFinData] = useState<StockFinancingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      setFinData(await stockDetailApi.financing(tsCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取分红融资数据失败');
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
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void fetchData()}>
            重试
          </Button>
        }
        sx={{ mt: 2 }}
      >
        {error}
      </Alert>
    );
  }

  const financings = finData?.items ?? [];

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        分红与配股数据接口已下线，当前仅展示后端仍提供的融资记录。
      </Alert>

      {/* 融资记录 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6">融资记录</Typography>
            <Chip label={`共 ${financings.length} 条`} size="small" variant="outlined" />
          </Box>

          {financings.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">暂无融资记录</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>融资类型</TableCell>
                    <TableCell>公告日</TableCell>
                    <TableCell align="right">融资金额(元)</TableCell>
                    <TableCell align="right">发行价(元)</TableCell>
                    <TableCell align="right">发行股数(万股)</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {financings.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{str(row.eventType)}</TableCell>
                      <TableCell>{date(row.announceDate)}</TableCell>
                      <TableCell align="right">{num(row.amount)}</TableCell>
                      <TableCell align="right">{num(row.price)}</TableCell>
                      <TableCell align="right">{num(row.shares)}</TableCell>
                      <TableCell>{str(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
