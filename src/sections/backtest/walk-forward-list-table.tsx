import type { WalkForwardRunSummary } from 'src/api/backtest';

import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

import { STATUS_COLOR, STATUS_LABEL, STRATEGY_TYPE_LABEL } from './constants';

// ----------------------------------------------------------------------

function pctCell(val: number | null) {
  if (val === null || val === undefined) return '—';
  const pct = (val * 100).toFixed(2);
  const color = val >= 0 ? 'success.main' : 'error.main';
  return (
    <Typography variant="body2" sx={{ color }}>
      {val >= 0 ? '+' : ''}
      {pct}%
    </Typography>
  );
}

// ----------------------------------------------------------------------

type Props = {
  rows: WalkForwardRunSummary[];
  loading: boolean;
};

export function WalkForwardListTable({ rows, loading }: Props) {
  const navigate = useNavigate();

  return (
    <Scrollbar>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称 / ID</TableCell>
              <TableCell>策略类型</TableCell>
              <TableCell>全量区间</TableCell>
              <TableCell>状态</TableCell>
              <TableCell align="right">OOS 年化收益</TableCell>
              <TableCell align="right">OOS 夏普</TableCell>
              <TableCell align="right">OOS 最大回撤</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" width={j === 0 ? 160 : 80} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow
                    key={row.wfRunId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/backtest/walk-forward/${row.wfRunId}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 200 }}>
                        {row.name || '未命名'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {row.wfRunId.slice(0, 8)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={STRATEGY_TYPE_LABEL[row.baseStrategyType] ?? row.baseStrategyType}
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {row.fullStartDate} ~ {row.fullEndDate}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Label color={STATUS_COLOR[row.status] ?? 'default'}>
                          {STATUS_LABEL[row.status] ?? row.status}
                        </Label>
                        {(row.status === 'RUNNING' || row.status === 'QUEUED') && (
                          <LinearProgress
                            variant="determinate"
                            value={row.progress}
                            sx={{ mt: 0.5, width: 80 }}
                          />
                        )}
                      </Box>
                    </TableCell>

                    <TableCell align="right">{pctCell(row.oosAnnualizedReturn)}</TableCell>
                    <TableCell align="right">
                      {row.oosSharpeRatio !== null ? row.oosSharpeRatio.toFixed(3) : '—'}
                    </TableCell>
                    <TableCell align="right">{pctCell(row.oosMaxDrawdown)}</TableCell>
                  </TableRow>
                ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                  暂无 Walk-Forward 任务
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Scrollbar>
  );
}
