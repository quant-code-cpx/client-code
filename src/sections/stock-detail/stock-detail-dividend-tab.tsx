import type { StockFinancingData, StockDividendFinancingData } from 'src/api/stock';

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

function date(v: unknown): string {
  if (!v) return '-';
  return String(v).slice(0, 10);
}

// ----------------------------------------------------------------------

export function StockDetailDividendTab({ tsCode }: Props) {
  const [divData, setDivData] = useState<StockDividendFinancingData | null>(null);
  const [finData, setFinData] = useState<StockFinancingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const [divResult, finResult] = await Promise.all([
        stockDetailApi.dividendFinancing(tsCode),
        stockDetailApi.financing(tsCode),
      ]);
      setDivData(divResult);
      setFinData(finResult);
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
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  const dividends = divData?.dividends ?? [];
  const allotments = divData?.allotments ?? [];
  const financings = finData?.items ?? [];

  return (
    <Stack spacing={3}>
      {/* 分红记录 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6">分红记录</Typography>
            <Chip label={`共 ${dividends.length} 条`} size="small" variant="outlined" />
          </Box>

          {dividends.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">暂无分红记录</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>公告日</TableCell>
                    <TableCell>报告期</TableCell>
                    <TableCell align="right">每股现金分红(税后)(元)</TableCell>
                    <TableCell align="right">每股送股(股)</TableCell>
                    <TableCell align="right">每股转增(股)</TableCell>
                    <TableCell>除权除息日</TableCell>
                    <TableCell>方案进度</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dividends.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{date(row.annDate)}</TableCell>
                      <TableCell>{date(row.endDate)}</TableCell>
                      <TableCell align="right">{num(row.cashDiv)}</TableCell>
                      <TableCell align="right">{num(row.stkBoRate)}</TableCell>
                      <TableCell align="right">{num(row.stkCoRate)}</TableCell>
                      <TableCell>{date(row.exDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={str(row.divProc)}
                          size="small"
                          variant="outlined"
                          color={String(row.divProc ?? '').includes('实施') ? 'success' : 'default'}
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

      {/* 配股记录 */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="h6">配股记录</Typography>
            <Chip label={`共 ${allotments.length} 条`} size="small" variant="outlined" />
          </Box>

          {allotments.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">暂无配股记录</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>公告日</TableCell>
                    <TableCell>配股基准日</TableCell>
                    <TableCell align="right">配股价格(元)</TableCell>
                    <TableCell align="right">配股比例</TableCell>
                    <TableCell align="right">配股数量(万股)</TableCell>
                    <TableCell align="right">募集资金净额(元)</TableCell>
                    <TableCell>上市日</TableCell>
                    <TableCell>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allotments.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{date(row.annDate)}</TableCell>
                      <TableCell>{date(row.baseDate)}</TableCell>
                      <TableCell align="right">{num(row.allotmentPrice)}</TableCell>
                      <TableCell align="right">{num(row.allotmentRatio)}</TableCell>
                      <TableCell align="right">{num(row.allotmentVol)}</TableCell>
                      <TableCell align="right">{num(row.raiseFonds)}</TableCell>
                      <TableCell>{date(row.marketDate)}</TableCell>
                      <TableCell>{str(row.stateDesc)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

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
