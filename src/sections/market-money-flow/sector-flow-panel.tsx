import type { SectorFlowItem } from 'src/api/market';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';

import { fPctChg, fWanYuan } from 'src/utils/format-number';

import { fetchSectorFlow } from 'src/api/market';

// ----------------------------------------------------------------------

type SortField = 'pct_change' | 'net_amount' | 'amount';

type Props = {
  tradeDate?: string;
};

export function SectorFlowPanel({ tradeDate }: Props) {
  const [data, setData] = useState<SectorFlowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('net_amount');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchSectorFlow({
        trade_date: tradeDate || undefined,
      });
      setData(result.sectors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取行业板块资金流向失败');
    } finally {
      setLoading(false);
    }
  }, [tradeDate, sortBy, order]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setOrder('desc');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h6">行业板块涨跌 · 资金流向</Typography>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>排序字段</InputLabel>
            <Select
              value={sortBy}
              label="排序字段"
              onChange={(e) => setSortBy(e.target.value as SortField)}
            >
              <MenuItem value="net_amount">净流入</MenuItem>
              <MenuItem value="pct_change">涨跌幅</MenuItem>
              <MenuItem value="amount">成交额</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={1}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>板块名称</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortBy === 'pct_change'}
                      direction={sortBy === 'pct_change' ? order : 'desc'}
                      onClick={() => handleSort('pct_change')}
                    >
                      涨跌幅
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortBy === 'net_amount'}
                      direction={sortBy === 'net_amount' ? order : 'desc'}
                      onClick={() => handleSort('net_amount')}
                    >
                      净流入（万）
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">净流入占比</TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={sortBy === 'amount'}
                      direction={sortBy === 'amount' ? order : 'desc'}
                      onClick={() => handleSort('amount')}
                    >
                      成交额（万）
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">涨家/跌家</TableCell>
                  <TableCell>领涨股</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.tsCode} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {row.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          color:
                            row.pctChange > 0
                              ? 'error.main'
                              : row.pctChange < 0
                                ? 'success.main'
                                : 'text.secondary',
                          fontWeight: 500,
                        }}
                      >
                        {fPctChg(row.pctChange)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box
                        sx={{
                          color:
                            row.netAmount > 0
                              ? 'error.main'
                              : row.netAmount < 0
                                ? 'success.main'
                                : 'text.secondary',
                        }}
                      >
                        {fWanYuan(row.netAmount)}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      {row.netAmountRate != null ? `${row.netAmountRate.toFixed(2)}%` : '-'}
                    </TableCell>
                    <TableCell align="right">{fWanYuan(row.amount)}</TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Box component="span" sx={{ color: 'error.main' }}>
                          {row.upCount}
                        </Box>
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          /
                        </Box>
                        <Box component="span" sx={{ color: 'success.main' }}>
                          {row.downCount}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {row.leadStock ? (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Typography variant="body2">{row.leadStock}</Typography>
                          <Box
                            component="span"
                            sx={{
                              fontSize: 12,
                              color: (row.leadPctChg ?? 0) >= 0 ? 'error.main' : 'success.main',
                            }}
                          >
                            {row.leadPctChg != null ? fPctChg(row.leadPctChg) : ''}
                          </Box>
                        </Stack>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {data.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        暂无数据
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
