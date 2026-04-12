import type { TradeLogItem, TradeLogSummaryResponse } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';

import { queryTradeLog, tradeLogSummary } from 'src/api/portfolio';

// ----------------------------------------------------------------------

const PAGE_SIZE = 20;

function toApiDate(yyyymmdd: string) {
  return yyyymmdd.replace(/-/g, '');
}

function defaultStartDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

function defaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

function fAmount(v: number | null) {
  if (v == null) return '--';
  return `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

// ----------------------------------------------------------------------

interface PortfolioTradeLogTabProps {
  portfolioId: string;
}

export function PortfolioTradeLogTab({ portfolioId }: PortfolioTradeLogTabProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<TradeLogSummaryResponse | null>(null);
  const [items, setItems] = useState<TradeLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(
    async (currentPage: number) => {
      setLoading(true);
      setError('');
      try {
        const [logRes, sumRes] = await Promise.all([
          queryTradeLog({
            portfolioId,
            startDate: toApiDate(startDate),
            endDate: toApiDate(endDate),
            action: actionFilter || undefined,
            page: currentPage,
            pageSize: PAGE_SIZE,
          }),
          tradeLogSummary({
            portfolioId,
            startDate: toApiDate(startDate),
            endDate: toApiDate(endDate),
          }),
        ]);
        setItems(logRes.items);
        setTotal(logRes.total);
        setSummary(sumRes);
      } catch {
        setError('加载交易日志失败');
      } finally {
        setLoading(false);
      }
    },
    [portfolioId, startDate, endDate, actionFilter]
  );

  useEffect(() => {
    fetchData(1);
    setPage(1);
  }, [fetchData]);

  const handleQuery = () => {
    fetchData(1);
    setPage(1);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    fetchData(newPage);
  };

  return (
    <Box>
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ flex: '1 1 160px' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                总交易笔数
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {summary.totalTrades}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 160px' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                总买入金额
              </Typography>
              <Typography variant="h6" fontWeight={700} color="error.main">
                {fAmount(summary.totalBuyAmount)}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: '1 1 160px' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary">
                总卖出金额
              </Typography>
              <Typography variant="h6" fontWeight={700} color="success.main">
                {fAmount(summary.totalSellAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="开始日期"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="结束日期"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>操作类型</InputLabel>
              <Select
                value={actionFilter}
                label="操作类型"
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="BUY">买入</MenuItem>
                <MenuItem value="SELL">卖出</MenuItem>
                <MenuItem value="ADJUST">调整</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" onClick={handleQuery} disabled={loading}>
              查询
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />}
      {!loading && error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>交易日期</TableCell>
                  <TableCell>操作</TableCell>
                  <TableCell>股票代码</TableCell>
                  <TableCell>股票名称</TableCell>
                  <TableCell align="right">数量</TableCell>
                  <TableCell align="right">价格</TableCell>
                  <TableCell align="right">金额</TableCell>
                  <TableCell>备注</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        暂无交易记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.tradeDate}</TableCell>
                      <TableCell>
                        <Chip
                          label={row.action === 'BUY' ? '买入' : row.action === 'SELL' ? '卖出' : row.action}
                          size="small"
                          color={
                            row.action === 'BUY' ? 'error' : row.action === 'SELL' ? 'success' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>{row.tsCode}</TableCell>
                      <TableCell>{row.stockName ?? '--'}</TableCell>
                      <TableCell align="right">{row.quantity.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {row.price != null ? row.price.toFixed(2) : '--'}
                      </TableCell>
                      <TableCell align="right">
                        {row.amount != null ? fAmount(row.amount) : '--'}
                      </TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.reason ?? '--'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {total > PAGE_SIZE && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <Pagination
                count={Math.ceil(total / PAGE_SIZE)}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}
