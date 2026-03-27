import type { StockFinancialsData } from 'src/api/stock';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
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

import { fNumber, fPercent } from 'src/utils/format-number';

import { stockDetailApi } from 'src/api/stock';

// ----------------------------------------------------------------------

type Props = { tsCode: string };

// 财务指标展示字段定义
const FINANCIAL_FIELDS: Array<{ key: string; label: string; format?: 'number' | 'percent' }> = [
  { key: 'eps', label: '每股收益(EPS)', format: 'number' },
  { key: 'bps', label: '每股净资产(BPS)', format: 'number' },
  { key: 'cfps', label: '每股现金流', format: 'number' },
  { key: 'grossProfitMargin', label: '毛利率', format: 'percent' },
  { key: 'netProfitMargin', label: '净利率', format: 'percent' },
  { key: 'roe', label: 'ROE(净资产收益率)', format: 'percent' },
  { key: 'roa', label: 'ROA(总资产收益率)', format: 'percent' },
  { key: 'debtToAssets', label: '资产负债率', format: 'percent' },
  { key: 'currentRatio', label: '流动比率', format: 'number' },
  { key: 'quickRatio', label: '速动比率', format: 'number' },
  { key: 'netProfit', label: '净利润(万元)', format: 'number' },
  { key: 'revenue', label: '营业收入(万元)', format: 'number' },
];

function formatValue(value: unknown, format?: 'number' | 'percent'): string {
  if (value == null) return '-';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  if (format === 'percent') return fPercent(num);
  return fNumber(num);
}

// ----------------------------------------------------------------------

export function StockDetailFinancialsTab({ tsCode }: Props) {
  const [data, setData] = useState<StockFinancialsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!tsCode) return;
    setLoading(true);
    setError('');
    try {
      const result = await stockDetailApi.financials(tsCode, 8);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取财务数据失败');
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
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={120} sx={{ borderRadius: 1.5 }} />
        ))}
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

  const history = data?.history ?? [];
  const periods = history.slice(0, 8);
  const latestExpress = data?.recentExpress ?? [];

  return (
    <Stack spacing={3}>
      {/* 最新快报 */}
      {latestExpress.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              最新业绩快报
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>报告期</TableCell>
                    <TableCell align="right">营业收入(万元)</TableCell>
                    <TableCell align="right">净利润(万元)</TableCell>
                    <TableCell align="right">每股收益</TableCell>
                    <TableCell align="right">净资产收益率(%)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latestExpress.map((row, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{String(row.reportDate ?? row.endDate ?? '-')}</TableCell>
                      <TableCell align="right">
                        {formatValue(row.revenue ?? row.totalRevenue)}
                      </TableCell>
                      <TableCell align="right">
                        {formatValue(row.netProfit ?? row.nProfit)}
                      </TableCell>
                      <TableCell align="right">{formatValue(row.eps)}</TableCell>
                      <TableCell align="right">{formatValue(row.roe, 'percent')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* 历史财务指标表 */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            历史财务指标
          </Typography>
          {periods.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">暂无财务数据</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper' }}>
                      指标
                    </TableCell>
                    {periods.map((row, i) => (
                      <TableCell key={i} align="right">
                        {String(row.endDate ?? row.reportDate ?? `期${i + 1}`)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {FINANCIAL_FIELDS.map(({ key, label, format }) => (
                    <TableRow key={key} hover>
                      <TableCell
                        sx={{
                          position: 'sticky',
                          left: 0,
                          bgcolor: 'background.paper',
                          color: 'text.secondary',
                          fontSize: 12,
                        }}
                      >
                        {label}
                      </TableCell>
                      {periods.map((row, i) => (
                        <TableCell key={i} align="right">
                          {formatValue(row[key], format)}
                        </TableCell>
                      ))}
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
