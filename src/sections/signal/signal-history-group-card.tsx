import type {
  SignalHistoryGroup,
  SignalForwardWindow,
  SignalHistoryViewMode,
} from 'src/api/signal';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fDateTime, fmtTradeDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { SignalHistoryRow } from './signal-history-row';

// ----------------------------------------------------------------------

type Props = {
  group: SignalHistoryGroup;
  index: number;
  forwardWindow: SignalForwardWindow;
  showHold: boolean;
  viewMode: SignalHistoryViewMode;
  alertThreshold?: number;
  onOpenDay: (group: SignalHistoryGroup) => void;
};

export function SignalHistoryGroupCard({
  group,
  index,
  forwardWindow,
  showHold,
  viewMode,
  alertThreshold,
  onOpenDay,
}: Props) {
  const [open, setOpen] = useState(index === 0);
  const visibleSignals = group.signals.filter((signal) => showHold || signal.action !== 'HOLD');
  const hiddenHoldCount = group.signals.length - visibleSignals.length;
  const counts = {
    buy: group.signals.filter((signal) => signal.action === 'BUY').length,
    sell: group.signals.filter((signal) => signal.action === 'SELL').length,
    hold: group.signals.filter((signal) => signal.action === 'HOLD').length,
  };

  return (
    <Card variant="outlined">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <ButtonBase
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={`${fmtTradeDate(group.tradeDate)} 信号分组`}
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            gap: 1.25,
            borderRadius: 1,
            display: 'flex',
            textAlign: 'left',
            alignItems: 'center',
            justifyContent: 'flex-start',
            '&:hover': { bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04) },
          })}
        >
          <Iconify icon={open ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} width={18} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle2">{fmtTradeDate(group.tradeDate)}</Typography>
              <Label color="default" variant="soft">
                {group.signalCount} 条
              </Label>
              <Label color="success" variant="soft">
                买入 {counts.buy}
              </Label>
              <Label color="error" variant="soft">
                卖出 {counts.sell}
              </Label>
              <Label color="default" variant="soft">
                持有 {counts.hold}
              </Label>
              {viewMode === 'position' && (
                <Label color="info" variant="soft">
                  持仓状态
                </Label>
              )}
            </Box>
            {group.generatedAt && (
              <Typography variant="caption" color="text.secondary">
                生成时间：{fDateTime(group.generatedAt)}
              </Typography>
            )}
          </Box>
        </ButtonBase>

        {group.diffFromPrev && (
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.75 }}>
            <Label color="success" variant="soft">
              +{group.diffFromPrev.added} 新进
            </Label>
            <Label color="error" variant="soft">
              -{group.diffFromPrev.removed} 退出
            </Label>
            <Label color="warning" variant="soft">
              ~{group.diffFromPrev.weightChanged} 调仓
            </Label>
          </Box>
        )}

        <Button
          size="small"
          variant="text"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDay(group);
          }}
        >
          打开
        </Button>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Divider />
        {visibleSignals.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {hiddenHoldCount > 0 ? `已隐藏 ${hiddenHoldCount} 条 HOLD 信号，可在高级筛选中打开` : '该交易日空仓'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
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
                  <TableCell align="right">
                    <Box component="span" aria-hidden="true" sx={{ display: 'inline-flex', p: 0.5 }}>
                      <Iconify icon="solar:arrow-right-bold" width={14} />
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleSignals.map((signal) => (
                  <SignalHistoryRow
                    key={`${signal.tsCode}-${signal.action}`}
                    signal={signal}
                    tradeDate={group.tradeDate}
                    forwardWindow={forwardWindow}
                    alertThreshold={alertThreshold}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Collapse>
    </Card>
  );
}
