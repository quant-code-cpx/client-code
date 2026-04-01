import type { BacktestTradeItem } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fNumber } from 'src/utils/format-number';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

interface BacktestTradesTableProps {
  items: BacktestTradeItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function BacktestTradesTable({
  items,
  total,
  page,
  pageSize,
  loading,
  onPageChange,
  onPageSizeChange,
}: BacktestTradesTableProps) {
  return (
    <Box>
      <Scrollbar>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>日期</TableCell>
                <TableCell>代码</TableCell>
                <TableCell>名称</TableCell>
                <TableCell>方向</TableCell>
                <TableCell align="right">成交价</TableCell>
                <TableCell align="right">数量（股）</TableCell>
                <TableCell align="right">成交额</TableCell>
                <TableCell align="right">手续费</TableCell>
                <TableCell>原因</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx} hover={true}>
                  <TableCell>
                    <Typography variant="caption">{item.tradeDate}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{item.tsCode}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{item.name ?? '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.side === 'BUY' ? '买入' : '卖出'}
                      size="small"
                      color={item.side === 'BUY' ? 'error' : 'success'}
                      variant="soft"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{item.price.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{fNumber(item.quantity)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{fNumber(Math.round(item.amount))}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">
                      {fNumber(Math.round(item.commission + item.stampDuty + item.slippageCost))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.reason ?? '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      暂无交易记录
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
        rowsPerPageOptions={[20, 50, 100]}
        labelRowsPerPage="每页"
      />
    </Box>
  );
}
