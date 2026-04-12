import type { SignalHistoryGroup as SignalHistoryGroupType } from 'src/api/signal';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type Props = {
  group: SignalHistoryGroupType;
};

export function SignalHistoryGroup({ group }: Props) {
  const formatDate = (dateStr: string) => {
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  };

  const actionColorMap = {
    BUY: 'success' as const,
    SELL: 'error' as const,
    HOLD: 'default' as const,
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {formatDate(group.tradeDate)}（{group.signalCount} 条信号）
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>股票代码</TableCell>
              <TableCell>股票名称</TableCell>
              <TableCell>操作</TableCell>
              <TableCell align="right">目标权重</TableCell>
              <TableCell align="right">置信度</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {group.signals.map((signal) => (
              <TableRow key={signal.tsCode}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {signal.tsCode}
                  </Typography>
                </TableCell>
                <TableCell>{signal.stockName}</TableCell>
                <TableCell>
                  <Label color={actionColorMap[signal.action]} variant="soft">
                    {signal.action}
                  </Label>
                </TableCell>
                <TableCell align="right">
                  {signal.targetWeight != null ? `${(signal.targetWeight * 100).toFixed(1)}%` : '—'}
                </TableCell>
                <TableCell align="right">
                  {signal.confidence != null ? (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <LinearProgress
                        variant="determinate"
                        value={Math.round(signal.confidence * 100)}
                        color={
                          signal.confidence >= 0.8
                            ? 'success'
                            : signal.confidence >= 0.5
                              ? 'warning'
                              : 'error'
                        }
                        sx={{ width: 48, height: 6, borderRadius: 1 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 36, textAlign: 'right' }}>
                        {Math.round(signal.confidence * 100)}%
                      </Typography>
                    </Box>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
