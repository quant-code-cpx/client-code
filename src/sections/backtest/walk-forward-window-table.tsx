import type { WalkForwardWindow } from 'src/api/backtest';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fmtTradeDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Scrollbar as ScrollbarEl } from 'src/components/scrollbar';

import { formatPercentValue, getEnabledParamKeys } from './walk-forward-utils';

// ----------------------------------------------------------------------

function pctCell(val: number | null, returnTone?: boolean) {
  if (val === null || val === undefined) return '—';
  const color = returnTone
    ? val > 0
      ? 'error.main'
      : val < 0
        ? 'success.main'
        : 'text.secondary'
    : val >= 0
      ? 'success.main'
      : 'error.main';
  return (
    <Typography variant="body2" sx={{ color }}>
      {formatPercentValue(val)}
    </Typography>
  );
}

// ----------------------------------------------------------------------

type Props = {
  windows: WalkForwardWindow[];
  onWindowClick?: (window: WalkForwardWindow) => void;
};

function windowStatus(window: WalkForwardWindow) {
  if (window.status === 'FAILED' || window.errorReason) return 'FAILED';
  if (window.status === 'OK') return 'OK';
  return 'UNKNOWN';
}

export function WalkForwardWindowTable({ windows, onWindowClick }: Props) {
  const paramKeys = getEnabledParamKeys(windows).slice(0, 6);
  const colSpan = 11 + paramKeys.length;

  return (
    <ScrollbarEl>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>窗口</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>IS 区间</TableCell>
              <TableCell>OOS 区间</TableCell>
              <TableCell align="right">IS 年化收益</TableCell>
              <TableCell align="right">IS 夏普</TableCell>
              <TableCell align="right">OOS 年化收益</TableCell>
              <TableCell align="right">OOS 夏普</TableCell>
              <TableCell align="right">OOS 最大回撤</TableCell>
              <TableCell align="right">OOS 成交</TableCell>
              {paramKeys.map((key) => (
                <TableCell key={key}>{key}</TableCell>
              ))}
              <TableCell>备注</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {windows.map((w) => (
              <TableRow
                key={w.windowIndex}
                hover={Boolean(onWindowClick)}
                role={onWindowClick ? 'button' : undefined}
                tabIndex={onWindowClick ? 0 : undefined}
                aria-label={onWindowClick ? `查看窗口 ${w.windowIndex + 1} 详情` : undefined}
                sx={{
                  cursor: onWindowClick ? 'pointer' : 'default',
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: -2,
                  },
                }}
                onClick={() => onWindowClick?.(w)}
                onKeyDown={(event) => {
                  if (!onWindowClick || (event.key !== 'Enter' && event.key !== ' ')) return;
                  event.preventDefault();
                  onWindowClick(w);
                }}
              >
                <TableCell>#{w.windowIndex + 1}</TableCell>
                <TableCell>
                  {windowStatus(w) === 'OK' && <Label color="success">OK</Label>}
                  {windowStatus(w) === 'FAILED' && <Label color="error">失败</Label>}
                  {windowStatus(w) === 'UNKNOWN' && <Label color="default">未知</Label>}
                </TableCell>
                <TableCell>
                  <Typography variant="caption" noWrap>
                    {fmtTradeDate(w.isStartDate)} ~ {fmtTradeDate(w.isEndDate)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" noWrap>
                    {fmtTradeDate(w.oosStartDate)} ~ {fmtTradeDate(w.oosEndDate)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{pctCell(w.isReturn, true)}</TableCell>
                <TableCell align="right">
                  {w.isSharpe !== null ? w.isSharpe.toFixed(3) : '—'}
                </TableCell>
                <TableCell align="right">{pctCell(w.oosReturn, true)}</TableCell>
                <TableCell align="right">
                  {w.oosSharpe !== null ? w.oosSharpe.toFixed(3) : '—'}
                </TableCell>
                <TableCell align="right">{pctCell(w.oosMaxDrawdown)}</TableCell>
                <TableCell align="right">{w.oosTrades ?? '—'}</TableCell>
                {paramKeys.map((key) => (
                  <TableCell key={key}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {String(w.optimizedParams?.[key] ?? '—')}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell>
                  <Typography
                    variant="caption"
                    color={w.errorReason ? 'error.main' : 'text.disabled'}
                  >
                    {w.errorReason ?? '点击查看窗口详情'}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {windows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  窗口数据尚未生成
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </ScrollbarEl>
  );
}
