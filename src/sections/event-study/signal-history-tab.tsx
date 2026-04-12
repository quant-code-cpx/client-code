import type { SignalHistoryResult } from 'src/api/event-study';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';

import { querySignals } from 'src/api/event-study';

import { Label } from 'src/components/label';

import { EVENT_TYPE_LABELS, SIGNAL_TYPE_CONFIG } from './constants';

// ----------------------------------------------------------------------

export function SignalHistoryTab() {
  const [tsCode, setTsCode] = useState('');
  const [filterTsCode, setFilterTsCode] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignalHistoryResult | null>(null);
  const [error, setError] = useState('');

  const fetchSignals = useCallback(async (p: number, ps: number, code: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await querySignals({
        page: p + 1,
        pageSize: ps,
        tsCode: code || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals(0, pageSize, '');
  }, [fetchSignals, pageSize]);

  const handleQuery = () => {
    setPage(0);
    setFilterTsCode(tsCode);
    fetchSignals(0, pageSize, tsCode);
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    fetchSignals(newPage, pageSize, filterTsCode);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ps = Number(e.target.value);
    setPageSize(ps);
    setPage(0);
    fetchSignals(0, ps, filterTsCode);
  };

  const eventTypeLabelFor = (type: string) =>
    EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] ?? type;

  return (
    <Stack spacing={3}>
      {/* 筛选栏 */}
      <Card sx={{ p: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            label="股票代码"
            placeholder="如 000001.SZ"
            value={tsCode}
            onChange={(e) => setTsCode(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <Button variant="contained" onClick={handleQuery}>
            查询
          </Button>
        </Stack>
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 60 }}>ID</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>规则名称</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>事件类型</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>股票代码</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>股票名称</TableCell>
                    <TableCell sx={{ minWidth: 100 }}>信号类型</TableCell>
                    <TableCell sx={{ minWidth: 120 }}>事件日期</TableCell>
                    <TableCell sx={{ minWidth: 160 }}>触发时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {!result || result.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          暂无信号历史
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    result.items.map((item) => {
                      const signalCfg = SIGNAL_TYPE_CONFIG[item.signalType];
                      return (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>{item.rule?.name ?? '-'}</TableCell>
                          <TableCell>
                            <Label color="default">
                              {eventTypeLabelFor(item.rule?.eventType ?? '')}
                            </Label>
                          </TableCell>
                          <TableCell>{item.tsCode}</TableCell>
                          <TableCell>{item.stockName ?? '-'}</TableCell>
                          <TableCell>
                            <Label color={signalCfg.color as 'success' | 'error' | 'info'}>
                              {signalCfg.label}
                            </Label>
                          </TableCell>
                          <TableCell>{item.eventDate}</TableCell>
                          <TableCell>
                            {item.triggeredAt
                              ? new Date(item.triggeredAt).toLocaleString('zh-CN', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={result?.total ?? 0}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[20, 50, 100]}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              labelRowsPerPage="每页行数"
            />
          </>
        )}
      </Card>
    </Stack>
  );
}
