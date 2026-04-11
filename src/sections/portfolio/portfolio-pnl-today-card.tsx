import type { PnlToday } from 'src/api/portfolio';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { getPnlToday } from 'src/api/portfolio';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface PortfolioPnlTodayCardProps {
  portfolioId: string;
}

export function PortfolioPnlTodayCard({ portfolioId }: PortfolioPnlTodayCardProps) {
  const [data, setData] = useState<PnlToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getPnlToday({ portfolioId });
      setData(res);
    } catch {
      setError('加载今日盈亏失败');
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pnlColor = data && data.todayPnl >= 0 ? 'success.main' : 'error.main';
  const pnlPctColor = data && data.todayPnlPct >= 0 ? 'success.main' : 'error.main';

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            今日盈亏
            {data?.tradeDate && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {fDate(data.tradeDate, 'YYYY-MM-DD')}
              </Typography>
            )}
          </Typography>
          <IconButton onClick={fetchData} disabled={loading} size="small">
            <Iconify icon="solar:refresh-bold" />
          </IconButton>
        </Box>

        {loading && <Skeleton variant="rectangular" height={80} />}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && data && (
          <>
            <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  今日盈亏
                </Typography>
                <Typography variant="h5" sx={{ color: pnlColor }}>
                  {data.todayPnl >= 0 ? '+' : ''}
                  {fCurrency(data.todayPnl)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  今日涨幅
                </Typography>
                <Typography variant="h5" sx={{ color: pnlPctColor }}>
                  {data.todayPnlPct >= 0 ? '+' : ''}
                  {(data.todayPnlPct * 100).toFixed(2)}%
                </Typography>
              </Box>
            </Box>

            {data.byHolding.length > 0 && (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>股票名称</TableCell>
                    <TableCell align="right">今日涨幅</TableCell>
                    <TableCell align="right">今日盈亏</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.byHolding.map((item) => {
                    const itemPnlColor =
                      item.todayPnl === null
                        ? undefined
                        : item.todayPnl >= 0
                          ? 'success.main'
                          : 'error.main';
                    const itemPctColor =
                      item.pctChg === null
                        ? undefined
                        : item.pctChg >= 0
                          ? 'success.main'
                          : 'error.main';
                    return (
                      <TableRow key={item.tsCode}>
                        <TableCell>{item.stockName}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: itemPctColor }}>
                            {item.pctChg === null
                              ? '-'
                              : `${item.pctChg >= 0 ? '+' : ''}${(item.pctChg * 100).toFixed(2)}%`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: itemPnlColor }}>
                            {item.todayPnl === null
                              ? '-'
                              : `${item.todayPnl >= 0 ? '+' : ''}${fCurrency(item.todayPnl)}`}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
