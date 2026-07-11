import type { SignalHistoryGroup, SignalForwardWindow } from 'src/api/signal';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fmtTradeDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { SignalHistoryRow } from './signal-history-row';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  group: SignalHistoryGroup | null;
  forwardWindow: SignalForwardWindow;
  onClose: () => void;
};

export function SignalHistoryDayDrawer({ open, group, forwardWindow, onClose }: Props) {
  const signals = group?.signals ?? [];
  const buyCount = signals.filter((signal) => signal.action === 'BUY').length;
  const sellCount = signals.filter((signal) => signal.action === 'SELL').length;
  const holdCount = signals.filter((signal) => signal.action === 'HOLD').length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: 1, md: 720 } } }}
    >
      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">单日信号详情</Typography>
            <Typography variant="body2" color="text.secondary">
              {group ? fmtTradeDate(group.tradeDate) : '—'} · 共 {signals.length} 条
            </Typography>
          </Box>
          <Tooltip title="关闭">
            <IconButton onClick={onClose} aria-label="关闭">
              <Iconify icon="solar:close-circle-bold" />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          <Label color="success" variant="soft">
            买入 {buyCount}
          </Label>
          <Label color="error" variant="soft">
            卖出 {sellCount}
          </Label>
          <Label color="default" variant="soft">
            持有 {holdCount}
          </Label>
          {group?.diffFromPrev && (
            <Label color="warning" variant="soft">
              调仓 {group.diffFromPrev.weightChanged}
            </Label>
          )}
        </Box>
      </Box>

      <Divider />

      <TableContainer sx={{ px: 2, py: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>代码</TableCell>
              <TableCell>名称</TableCell>
              <TableCell>操作</TableCell>
              <TableCell align="right">现权重</TableCell>
              <TableCell align="right">目标W</TableCell>
              <TableCell align="right">置信度</TableCell>
              <TableCell align="right">T+1</TableCell>
              <TableCell align="right">T+5</TableCell>
              <TableCell align="right">T+20</TableCell>
              <TableCell align="right">超额</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {signals.map((signal) => (
              <SignalHistoryRow
                key={`${signal.tsCode}-${signal.action}`}
                signal={signal}
                tradeDate={group?.tradeDate ?? ''}
                forwardWindow={forwardWindow}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Drawer>
  );
}
