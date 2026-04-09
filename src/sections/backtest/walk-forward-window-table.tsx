import type { WalkForwardWindow } from 'src/api/backtest';

import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Scrollbar as ScrollbarEl } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

function pctCell(val: number | null) {
  if (val === null || val === undefined) return '—';
  const color = val >= 0 ? 'success.main' : 'error.main';
  const str = `${val >= 0 ? '+' : ''}${(val * 100).toFixed(2)}%`;
  return (
    <Typography variant="body2" sx={{ color }}>
      {str}
    </Typography>
  );
}

// ----------------------------------------------------------------------

type Props = {
  windows: WalkForwardWindow[];
};

export function WalkForwardWindowTable({ windows }: Props) {
  return (
    <ScrollbarEl>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>窗口</TableCell>
              <TableCell>IS 区间</TableCell>
              <TableCell>OOS 区间</TableCell>
              <TableCell align="right">IS 年化收益</TableCell>
              <TableCell align="right">IS 夏普</TableCell>
              <TableCell align="right">OOS 年化收益</TableCell>
              <TableCell align="right">OOS 夏普</TableCell>
              <TableCell align="right">OOS 最大回撤</TableCell>
              <TableCell>最优参数</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {windows.map((w) => (
              <TableRow key={w.windowIndex} hover>
                <TableCell>#{w.windowIndex + 1}</TableCell>
                <TableCell>
                  <Typography variant="caption" noWrap>
                    {w.isStartDate} ~ {w.isEndDate}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" noWrap>
                    {w.oosStartDate} ~ {w.oosEndDate}
                  </Typography>
                </TableCell>
                <TableCell align="right">{pctCell(w.isReturn)}</TableCell>
                <TableCell align="right">
                  {w.isSharpe !== null ? w.isSharpe.toFixed(3) : '—'}
                </TableCell>
                <TableCell align="right">{pctCell(w.oosReturn)}</TableCell>
                <TableCell align="right">
                  {w.oosSharpe !== null ? w.oosSharpe.toFixed(3) : '—'}
                </TableCell>
                <TableCell align="right">{pctCell(w.oosMaxDrawdown)}</TableCell>
                <TableCell>
                  {w.optimizedParams ? (
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {JSON.stringify(w.optimizedParams)}
                    </Typography>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
            {windows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.disabled' }}>
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
