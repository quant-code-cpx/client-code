import type { BacktestRebalanceLogItem } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

interface BacktestRebalanceLogTableProps {
  items: BacktestRebalanceLogItem[];
  loading: boolean;
}

export function BacktestRebalanceLogTable({ items, loading }: BacktestRebalanceLogTableProps) {
  return (
    <Scrollbar>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              <TableCell>信号日</TableCell>
              <TableCell>执行日</TableCell>
              <TableCell align="right">目标持仓数</TableCell>
              <TableCell align="right">实际买入</TableCell>
              <TableCell align="right">实际卖出</TableCell>
              <TableCell align="right">涨跌停跳过</TableCell>
              <TableCell align="right">停牌跳过</TableCell>
              <TableCell>备注</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {items.map((item, idx) => (
              <TableRow key={idx} hover={true}>
                <TableCell>
                  <Typography variant="caption">{item.signalDate}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{item.executeDate}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption">{item.targetCount}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ color: 'error.main' }}>
                    {item.actualBuy}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="caption" sx={{ color: 'success.main' }}>
                    {item.actualSell}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="caption"
                    sx={{ color: item.skippedLimitUp > 0 ? 'warning.main' : 'text.secondary' }}
                  >
                    {item.skippedLimitUp}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography
                    variant="caption"
                    sx={{ color: item.skippedSuspend > 0 ? 'warning.main' : 'text.secondary' }}
                  >
                    {item.skippedSuspend}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {item.remark ?? '-'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}

            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    暂无调仓日志
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
