import type { HoldingDetailItem, PortfolioCashEventItem } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fNullableCurrency } from 'src/utils/format-portfolio';

import { listPortfolioCashEvents } from 'src/api/portfolio';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { PortfolioCashEventDialog } from './portfolio-cash-event-dialog';
import { PortfolioShareActionDialog } from './portfolio-share-action-dialog';

// ----------------------------------------------------------------------

const EVENT_LABELS: Record<string, string> = {
  OPENING_BALANCE: '初始资金',
  POSITION_ADJUSTMENT: '持仓校正',
  TRADE_BUY: '买入成交',
  TRADE_SELL: '卖出成交',
  DEPOSIT: '入金',
  WITHDRAWAL: '出金',
  DIVIDEND: '现金分红',
  FEE: '费用',
  TAX: '税费',
};

function signedAmount(event: PortfolioCashEventItem) {
  const prefix = event.amount > 0 ? '+' : '';
  return `${prefix}${fNullableCurrency(event.amount)}`;
}

interface PortfolioCashLedgerTabProps {
  portfolioId: string;
  holdings: HoldingDetailItem[];
  onPortfolioRefresh: () => void | Promise<void>;
}

export function PortfolioCashLedgerTab({
  portfolioId,
  holdings,
  onPortfolioRefresh,
}: PortfolioCashLedgerTabProps) {
  const [items, setItems] = useState<PortfolioCashEventItem[]>([]);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [shareActionOpen, setShareActionOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await listPortfolioCashEvents({
        portfolioId,
        page: page + 1,
        pageSize,
      });
      setItems(result.items);
      setCashBalance(result.cashBalance);
      setTotal(result.total);
    } catch {
      setError('加载现金账本失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId, page, pageSize]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleMutationSuccess = async () => {
    await Promise.all([fetchEvents(), Promise.resolve(onPortfolioRefresh())]);
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                现金账本
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                当前现金：{fNullableCurrency(cashBalance)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:shuffle-bold" />}
                onClick={() => setShareActionOpen(true)}
                disabled={holdings.length === 0}
              >
                送股 / 拆并股
              </Button>
              <Button
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-bold" />}
                onClick={() => setCashDialogOpen(true)}
              >
                记录现金事件
              </Button>
            </Box>
          </Box>

          {loading ? <Skeleton variant="rectangular" height={260} /> : null}
          {!loading && error ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={fetchEvents}>
                  重试
                </Button>
              }
            >
              {error}
            </Alert>
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <Alert severity="info">暂无现金事件，请先检查组合初始资金是否已迁移。</Alert>
          ) : null}
          {!loading && !error && items.length > 0 ? (
            <>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>生效日</TableCell>
                      <TableCell>类型</TableCell>
                      <TableCell>标的</TableCell>
                      <TableCell align="right">现金变动（元）</TableCell>
                      <TableCell align="right">事件后余额（元）</TableCell>
                      <TableCell>口径</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>{item.effectiveDate}</TableCell>
                        <TableCell>{EVENT_LABELS[item.eventType] ?? item.eventType}</TableCell>
                        <TableCell>{item.tsCode ?? '--'}</TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            sx={{
                              color:
                                item.amount > 0
                                  ? 'error.main'
                                  : item.amount < 0
                                    ? 'success.main'
                                    : 'text.secondary',
                            }}
                          >
                            {signedAmount(item)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{fNullableCurrency(item.balanceAfter)}</TableCell>
                        <TableCell>
                          <Label color={item.isEstimated ? 'warning' : 'success'} variant="soft">
                            {item.isEstimated ? '估算' : '精确'}
                          </Label>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={pageSize}
                rowsPerPageOptions={[20, 50, 100]}
                onPageChange={(_, nextPage) => setPage(nextPage)}
                onRowsPerPageChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(0);
                }}
                labelRowsPerPage="每页"
              />
            </>
          ) : null}
        </CardContent>
      </Card>

      <PortfolioCashEventDialog
        open={cashDialogOpen}
        portfolioId={portfolioId}
        onClose={() => setCashDialogOpen(false)}
        onSuccess={handleMutationSuccess}
      />
      <PortfolioShareActionDialog
        open={shareActionOpen}
        portfolioId={portfolioId}
        holdings={holdings}
        onClose={() => setShareActionOpen(false)}
        onSuccess={handleMutationSuccess}
      />
    </Box>
  );
}
