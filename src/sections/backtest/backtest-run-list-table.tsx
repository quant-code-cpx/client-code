import type { MouseEvent } from 'react';
import type { BacktestRunListItem, BacktestRunSortField } from 'src/api/backtest';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fRatioPercent } from 'src/utils/format-number';
import { fDateTime, fmtTradeDate } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { BacktestRunListTableHead } from './backtest-run-list-table-head';
import { STATUS_COLOR, STATUS_LABEL, STRATEGY_TYPE_LABEL } from './constants';

import type { RunListSort } from './hooks/use-backtest-run-list-state';

// ----------------------------------------------------------------------

interface BacktestRunListTableProps {
  items: BacktestRunListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  sort: RunListSort;
  selectedRunIds: string[];
  highlightRunId?: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (field: BacktestRunSortField) => void;
  onToggleSelect: (runId: string) => void;
  onToggleSelectAll: (runIds: string[], checked: boolean) => void;
  onView: (runId: string) => void;
  onCopy: (item: BacktestRunListItem) => void;
  onCancel: (item: BacktestRunListItem) => void;
  onUnsupportedAction: (message: string) => void;
}

const TAG_COLORS = new Set([
  'default',
  'primary',
  'secondary',
  'info',
  'success',
  'warning',
  'error',
]);

const PENDING_ACTIONS = [
  ['重命名', 'solar:pen-bold'],
  ['一键重试', 'solar:restart-bold'],
  ['归档 / 恢复', 'solar:archive-bold'],
  ['收藏 / 取消收藏', 'solar:star-bold'],
  ['设置标签', 'solar:tag-bold'],
  ['生成报告', 'solar:document-add-bold'],
  ['应用到组合', 'solar:case-round-bold'],
] as const;

function pctCell(value: number | null, isNegativeGood?: boolean) {
  if (value == null) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        —
      </Typography>
    );
  }

  const color = isNegativeGood
    ? value < 0
      ? 'success.dark'
      : 'error.dark'
    : value >= 0
      ? 'error.dark'
      : 'success.dark';

  return (
    <Typography variant="body2" sx={{ color, fontFeatureSettings: '"tnum"' }}>
      {value >= 0 ? '+' : ''}
      {fRatioPercent(value)}
    </Typography>
  );
}

function numberCell(value: number | null) {
  return value != null ? (
    <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
      {value.toFixed(2)}
    </Typography>
  ) : (
    <Typography variant="body2" sx={{ color: 'text.disabled' }}>
      —
    </Typography>
  );
}

function diffSeconds(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return null;
  return Math.round((endTime - startTime) / 1000);
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getDuration(item: BacktestRunListItem) {
  return (
    item.durationSeconds ??
    diffSeconds(item.startedAt ?? item.createdAt, item.completedAt) ??
    (item.status === 'RUNNING'
      ? diffSeconds(item.startedAt ?? item.createdAt, new Date().toISOString())
      : null)
  );
}

function StatusCell({ item }: { item: BacktestRunListItem }) {
  if (item.status === 'RUNNING') {
    return (
      <Box sx={{ minWidth: 120 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(Math.max(item.progress ?? 0, 0), 100)}
            sx={{ flex: 1, height: 4, borderRadius: 1 }}
          />
          <Typography variant="caption" sx={{ fontFeatureSettings: '"tnum"' }}>
            {Math.round(item.progress ?? 0)}%
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          运行中
        </Typography>
      </Box>
    );
  }

  if (item.status === 'QUEUED') {
    return (
      <Box>
        <Label color="default" variant="soft">
          {item.queuePosition ? `排队中 #${item.queuePosition}` : '排队中'}
        </Label>
        {item.etaSeconds ? (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
            预计 {formatDuration(item.etaSeconds)}
          </Typography>
        ) : null}
      </Box>
    );
  }

  return (
    <Box>
      <Label color={STATUS_COLOR[item.status] ?? 'default'} variant="soft">
        {STATUS_LABEL[item.status] ?? item.status}
      </Label>
      {item.status === 'FAILED' && (item.failedReasonLabel || item.failedReason) ? (
        <Tooltip title={item.failedReason ?? item.failedReasonLabel ?? ''}>
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              display: 'block',
              maxWidth: 160,
              color: 'text.secondary',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {item.failedReasonLabel ?? item.failedReason}
          </Typography>
        </Tooltip>
      ) : null}
    </Box>
  );
}

function tagColor(color: string | undefined) {
  return TAG_COLORS.has(color ?? '')
    ? (color as 'default' | 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error')
    : 'default';
}

export function BacktestRunListTable({
  items,
  total,
  page,
  pageSize,
  loading,
  sort,
  selectedRunIds,
  highlightRunId,
  onPageChange,
  onPageSizeChange,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onView,
  onCopy,
  onCancel,
  onUnsupportedAction,
}: BacktestRunListTableProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuItem, setMenuItem] = useState<BacktestRunListItem | null>(null);
  const selectedSet = useMemo(() => new Set(selectedRunIds), [selectedRunIds]);

  const openMenu = (event: MouseEvent<HTMLElement>, item: BacktestRunListItem) => {
    setMenuAnchor(event.currentTarget);
    setMenuItem(item);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuItem(null);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    closeMenu();
  };

  return (
    <Box>
      <Scrollbar>
        <TableContainer sx={{ overflow: 'unset' }}>
          <Table sx={{ minWidth: 1180 }}>
            <BacktestRunListTableHead
              items={items}
              selectedRunIds={selectedSet}
              sort={sort}
              onSort={onSort}
              onToggleSelectAll={onToggleSelectAll}
            />

            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 12 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton width={j === 11 ? 56 : '80%'} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : items.map((item) => {
                    const selected = selectedSet.has(item.runId);
                    const highlighted = highlightRunId === item.runId;

                    return (
                      <TableRow
                        key={item.runId}
                        hover
                        selected={selected}
                        sx={(theme) => ({
                          ...(highlighted && {
                            boxShadow: `inset 2px 0 0 ${theme.vars.palette.primary.main}`,
                            bgcolor: 'action.selected',
                          }),
                        })}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={selected}
                            onChange={() => onToggleSelect(item.runId)}
                            slotProps={{
                              input: { 'aria-label': `选择 ${item.name ?? item.runId}` },
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {item.name ?? '未命名回测'}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                <Tooltip title={item.runId}>
                                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                    {item.runId.slice(0, 8)}…
                                  </Typography>
                                </Tooltip>
                                <Tooltip title="复制 runId">
                                  <IconButton
                                    size="small"
                                    aria-label={`复制回测任务 ${item.runId}`}
                                    onClick={() => navigator.clipboard?.writeText(item.runId)}
                                  >
                                    <Iconify icon="solar:copy-bold" width={14} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                            {item.starred ? <Iconify icon="solar:star-bold" width={16} /> : null}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {STRATEGY_TYPE_LABEL[item.strategyType] ?? item.strategyType}
                          </Typography>
                          {item.source ? (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {item.source}
                            </Typography>
                          ) : null}
                        </TableCell>

                        <TableCell>
                          <StatusCell item={item} />
                        </TableCell>

                        <TableCell>
                          <Typography variant="caption">
                            {fmtTradeDate(item.startDate)} ~<br />
                            {fmtTradeDate(item.endDate)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', color: 'text.secondary' }}
                          >
                            {item.benchmarkTsCode}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', minWidth: 120 }}>
                            {item.tags?.length ? (
                              item.tags
                                .slice(0, 2)
                                .map((tag) => (
                                  <Chip
                                    key={tag.id}
                                    size="small"
                                    color={tagColor(tag.color)}
                                    variant="outlined"
                                    label={tag.name}
                                  />
                                ))
                            ) : (
                              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                —
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell align="right">{pctCell(item.totalReturn)}</TableCell>
                        <TableCell align="right">{pctCell(item.maxDrawdown, true)}</TableCell>
                        <TableCell align="right">{numberCell(item.sharpeRatio)}</TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontFeatureSettings: '"tnum"' }}>
                            {formatDuration(getDuration(item))}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="caption">
                            {fDateTime(item.createdAt, 'YYYY-MM-DD HH:mm')}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => onView(item.runId)}
                              startIcon={<Iconify icon="solar:eye-bold" width={14} />}
                            >
                              查看
                            </Button>
                            <Tooltip title={`打开 ${item.name ?? item.runId} 操作菜单`}>
                              <IconButton
                                size="small"
                                aria-label={`打开 ${item.name ?? item.runId} 操作菜单`}
                                onClick={(event) => openMenu(event, item)}
                              >
                                <Iconify icon="solar:menu-dots-bold" width={18} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}

              {!loading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} align="center" sx={{ py: 8 }}>
                    <Iconify icon="solar:clipboard-list-bold" width={40} />
                    <Typography variant="subtitle1" sx={{ mt: 1 }}>
                      暂无回测记录
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                      可以先去回测工作台提交一次任务，完成后这里会展示运行状态与指标摘要。
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, p) => onPageChange(p)}
        onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="每页"
      />

      <Menu open={Boolean(menuAnchor)} anchorEl={menuAnchor} onClose={closeMenu}>
        <MenuItem
          disabled={menuItem === null}
          onClick={() => menuItem && handleMenuAction(() => onCopy(menuItem))}
        >
          <ListItemIcon>
            <Iconify icon="solar:copy-bold" width={18} />
          </ListItemIcon>
          <ListItemText>复制重跑</ListItemText>
        </MenuItem>

        <MenuItem
          disabled={!menuItem || !['QUEUED', 'RUNNING'].includes(menuItem.status)}
          onClick={() => menuItem && handleMenuAction(() => onCancel(menuItem))}
        >
          <ListItemIcon>
            <Iconify icon="solar:stop-circle-bold" width={18} />
          </ListItemIcon>
          <ListItemText>取消任务</ListItemText>
        </MenuItem>

        {PENDING_ACTIONS.map(([label, icon]) => (
          <MenuItem
            key={label}
            disabled
            onClick={() => onUnsupportedAction(`${label} 需要后端端点支持`)}
          >
            <ListItemIcon>
              <Iconify icon={icon} width={18} />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
          </MenuItem>
        ))}

        <MenuItem
          disabled
          sx={{ color: 'error.main' }}
          onClick={() => onUnsupportedAction('删除需要后端软删除端点支持')}
        >
          <ListItemIcon sx={{ color: 'error.main' }}>
            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
          </ListItemIcon>
          <ListItemText>删除</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
