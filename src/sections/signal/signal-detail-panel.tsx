import type { TradingSignalItem } from 'src/api/signal';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Collapse from '@mui/material/Collapse';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  signals: TradingSignalItem[];
};

export function SignalDetailPanel({ signals }: Props) {
  const buySignals = signals.filter((s) => s.action === 'BUY');
  const sellSignals = signals.filter((s) => s.action === 'SELL');
  const holdSignals = signals.filter((s) => s.action === 'HOLD');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {buySignals.length > 0 && (
        <SignalGroup title="BUY 信号" action="BUY" signals={buySignals} defaultOpen />
      )}

      {sellSignals.length > 0 && (
        <SignalGroup title="SELL 信号" action="SELL" signals={sellSignals} defaultOpen />
      )}

      {holdSignals.length > 0 && (
        <SignalGroup title="HOLD 信号" action="HOLD" signals={holdSignals} defaultOpen={false} />
      )}

      {signals.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
          该交易日无信号数据
        </Typography>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

type SignalGroupProps = {
  title: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  signals: TradingSignalItem[];
  defaultOpen: boolean;
};

function SignalGroup({ title, action, signals, defaultOpen }: SignalGroupProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  const colorMap = {
    BUY: 'success' as const,
    SELL: 'error' as const,
    HOLD: 'default' as const,
  };

  const bgColorMap = {
    BUY: varAlpha(theme.vars.palette.success.mainChannel, 0.08),
    SELL: varAlpha(theme.vars.palette.error.mainChannel, 0.08),
    HOLD: undefined,
  };

  return (
    <Card variant="outlined" sx={{ bgcolor: bgColorMap[action] }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          cursor: 'pointer',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Label color={colorMap[action]} variant="filled">
            {action}
          </Label>
          <Typography variant="subtitle2">
            {title}（{signals.length} 只）
          </Typography>
        </Box>

        <Button size="small" color="inherit">
          <Iconify icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />
        </Button>
      </Box>

      <Collapse in={open}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>股票代码</TableCell>
                <TableCell>股票名称</TableCell>
                <TableCell align="right">目标权重</TableCell>
                <TableCell align="right">置信度</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {signals.map((signal) => (
                <TableRow key={signal.tsCode}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {signal.tsCode}
                    </Typography>
                  </TableCell>
                  <TableCell>{signal.stockName}</TableCell>
                  <TableCell align="right">
                    {signal.targetWeight != null
                      ? `${(signal.targetWeight * 100).toFixed(1)}%`
                      : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <ConfidenceCell value={signal.confidence} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Collapse>
    </Card>
  );
}

// ----------------------------------------------------------------------

function ConfidenceCell({ value }: { value: number | null }) {
  if (value == null) {
    return <Typography variant="body2">—</Typography>;
  }

  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? 'success' : value >= 0.5 ? 'warning' : 'error';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ width: 48, height: 6, borderRadius: 1 }}
      />
      <Typography variant="body2" sx={{ minWidth: 36, textAlign: 'right' }}>
        {pct}%
      </Typography>
    </Box>
  );
}
