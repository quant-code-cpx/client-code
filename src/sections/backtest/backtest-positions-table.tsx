import type { BacktestPositionItem } from 'src/api/backtest';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

interface BacktestPositionsTableProps {
  items: BacktestPositionItem[];
  loading: boolean;
}

export function BacktestPositionsTable({ items, loading }: BacktestPositionsTableProps) {
  return (
    <Scrollbar>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>代码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell align="right">数量（股）</TableCell>
              <TableCell align="right">成本价</TableCell>
              <TableCell align="right">收盘价</TableCell>
              <TableCell align="right">市值</TableCell>
              <TableCell align="right">权重</TableCell>
              <TableCell align="right">浮盈亏</TableCell>
              <TableCell align="right">持有天数</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item, idx) => {
              const pnlColor =
                item.unrealizedPnl >= 0 ? 'error.main' : 'success.main';
              return (
                <TableRow key={idx} hover>
                  <TableCell>
                    <Typography variant="caption">{item.tsCode}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{item.name ?? '-'}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{fNumber(item.quantity)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{item.costPrice.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{item.closePrice.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{fNumber(Math.round(item.marketValue))}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{fPercent(item.weight)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" sx={{ color: pnlColor }}>
                      {item.unrealizedPnl >= 0 ? '+' : ''}{fNumber(Math.round(item.unrealizedPnl))}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption">{item.holdingDays} 天</Typography>
                  </TableCell>
                </TableRow>
              );
            })}

            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    暂无持仓快照数据
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
