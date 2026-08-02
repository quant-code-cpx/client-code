import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import type { MarketPeriod, MarketKLineData } from './market-kline.types';

function formatNumber(value: number | undefined, digits = 2): string {
  return value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(value);
}

export function MarketKlineTable({
  tsCode,
  period,
  bars,
}: {
  tsCode: string;
  period: MarketPeriod;
  bars: MarketKLineData[];
}) {
  const tableBars = bars.slice(-200).reverse();
  const [page, setPage] = useState(0);
  const rowsPerPage = 50;

  useEffect(() => {
    setPage(0);
  }, [bars, period, tsCode]);

  const visibleBars = tableBars.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return (
    <Box component="details" sx={{ mt: 1 }}>
      <Typography component="summary" variant="caption" sx={{ cursor: 'pointer', fontWeight: 700 }}>
        查看行情数据表{bars.length > tableBars.length ? '（最近 200 条）' : ''}
      </Typography>
      <TableContainer sx={{ mt: 1, maxHeight: 320, fontVariantNumeric: 'tabular-nums' }}>
        <Table size="small" stickyHeader aria-label={`${tsCode} 行情数据`}>
          <TableHead>
            <TableRow>
              <TableCell>{period === 'T' ? '时间' : '交易日'}</TableCell>
              {['开', '高', '低', '收', '成交量（手）', '成交额（千元）'].map((label) => (
                <TableCell key={label} align="right">
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleBars.map((bar) => (
              <TableRow key={bar.timestamp} hover>
                <TableCell>{period === 'T' ? bar.time : bar.tradeDate}</TableCell>
                {[bar.open, bar.high, bar.low, bar.close].map((value, index) => (
                  <TableCell key={index} align="right">
                    {formatNumber(value)}
                  </TableCell>
                ))}
                <TableCell align="right">{formatNumber(bar.volumeHands, 0)}</TableCell>
                <TableCell align="right">{formatNumber(bar.amountThousands, 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {tableBars.length > rowsPerPage ? (
        <TablePagination
          component="div"
          count={tableBars.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[rowsPerPage]}
          labelRowsPerPage="每页"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          onPageChange={(_, nextPage) => setPage(nextPage)}
        />
      ) : null}
    </Box>
  );
}
