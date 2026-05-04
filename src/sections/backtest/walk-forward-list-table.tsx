import type { WalkForwardRunSummary } from 'src/api/backtest';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { STATUS_COLOR, STATUS_LABEL, STRATEGY_TYPE_LABEL } from './constants';
import { robustnessColor, robustnessLabel, formatPercentValue } from './walk-forward-utils';

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
  onDelete?: (row: WalkForwardRunSummary) => void;
};

export function WalkForwardListTable({ rows, loading, onDelete }: Props) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [activeRow, setActiveRow] = useState<WalkForwardRunSummary | null>(null);

  const closeMenu = () => {
    setAnchorEl(null);
    setActiveRow(null);
  };

  const handleCopyId = () => {
    if (activeRow && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(activeRow.wfRunId);
    }
    closeMenu();
  };

  const handleDelete = () => {
    if (activeRow) onDelete?.(activeRow);
    closeMenu();
  };

  return (
    <Scrollbar>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名称 / ID</TableCell>
              <TableCell>策略类型</TableCell>
              <TableCell>全量区间</TableCell>
              <TableCell>窗口模式</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>稳健性</TableCell>
              <TableCell align="right">WFE</TableCell>
              <TableCell align="right">OOS 年化收益</TableCell>
              <TableCell align="right">OOS 夏普</TableCell>
              <TableCell align="right">OOS 最大回撤</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((__, j) => (
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
                      <Chip size="small" label={row.windowMode ?? 'ROLLING'} variant="outlined" />
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

                    <TableCell>
                      {row.robustnessLevel ? (
                        <Label color={robustnessColor(row.robustnessLevel)}>
                          {robustnessLabel(row.robustnessLevel)}
                        </Label>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          待计算
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="right">{formatPercentValue(row.wfe, 1)}</TableCell>
                    <TableCell align="right">{pctCell(row.oosAnnualizedReturn)}</TableCell>
                    <TableCell align="right">
                      {row.oosSharpeRatio !== null ? row.oosSharpeRatio.toFixed(3) : '—'}
                    </TableCell>
                    <TableCell align="right">{pctCell(row.oosMaxDrawdown)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="更多操作">
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAnchorEl(event.currentTarget);
                            setActiveRow(row);
                          }}
                        >
                          <Iconify icon="eva:more-vertical-fill" width={18} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.disabled' }}>
                  暂无 Walk-Forward 任务
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        <MenuItem onClick={handleCopyId}>
          <ListItemIcon>
            <Iconify icon="solar:copy-bold" width={18} />
          </ListItemIcon>
          复制任务 ID
        </MenuItem>
        <MenuItem onClick={handleDelete} disabled={!onDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
          </ListItemIcon>
          删除任务
        </MenuItem>
      </Menu>
    </Scrollbar>
  );
}
