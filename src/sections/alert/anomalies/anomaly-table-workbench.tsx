import type { MarketAnomaly } from 'src/api/alert';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { RouterLink } from 'src/routes/components';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

import { AnomalyEmptyState } from './anomaly-empty-state';
import { ANOMALY_PAGE_SIZE_OPTIONS } from './use-anomaly-monitor-state';
import { AnomalyAddWatchlistDialog } from './anomaly-add-watchlist-dialog';
import {
  fmtTradeDate,
  getSeverityMeta,
  fallbackSeverity,
  formatAnomalyValue,
  getAnomalyTypeConfig,
  formatAnomalyThreshold,
} from './anomaly-type-config';

// ----------------------------------------------------------------------

type Props = {
  items: MarketAnomaly[];
  loading: boolean;
  error: string;
  total: number;
  pageIndex: number;
  pageSize: number;
  hasFilters: boolean;
  isAdmin: boolean;
  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClearFilter: () => void;
  onSwitchLatest: () => void;
  onScan: () => void;
  onRetry: () => void;
  onOpenDetail: (anomaly: MarketAnomaly) => void;
};

export function AnomalyTableWorkbench({
  items,
  loading,
  error,
  total,
  pageIndex,
  pageSize,
  hasFilters,
  isAdmin,
  onPageChange,
  onPageSizeChange,
  onClearFilter,
  onSwitchLatest,
  onScan,
  onRetry,
  onOpenDetail,
}: Props) {
  const theme = useTheme();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({ open: false, message: '', severity: 'success' });

  const allSelected = items.length > 0 && items.every((it) => selectedIds.has(it.id));
  const someSelected = items.some((it) => selectedIds.has(it.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        items.forEach((it) => next.delete(it.id));
        return next;
      }
      const next = new Set(prev);
      items.forEach((it) => next.add(it.id));
      return next;
    });
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTsCodes = Array.from(
    new Set(items.filter((it) => selectedIds.has(it.id)).map((it) => it.tsCode))
  );

  const handleCopyCodes = async () => {
    if (selectedTsCodes.length === 0) return;
    try {
      await navigator.clipboard.writeText(selectedTsCodes.join('\n'));
      setFeedback({
        open: true,
        severity: 'success',
        message: `已复制 ${selectedTsCodes.length} 个股票代码到剪贴板`,
      });
    } catch {
      setFeedback({ open: true, severity: 'error', message: '复制失败，请手动选择' });
    }
  };

  const handleAddWatchlistSuccess = (added: number, skipped: number) => {
    setFeedback({
      open: true,
      severity: 'success',
      message: `成功加入 ${added} 只，跳过 ${skipped} 只（已存在）`,
    });
    setSelectedIds(new Set());
  };

  // ── render ────────────────────────────────────────────────────────────────

  const showLoadingSkeleton = loading && items.length === 0;
  const showError = !loading && error;
  const showEmpty = !loading && !error && items.length === 0;

  return (
    <Box>
      {someSelected && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 2,
            py: 1,
            bgcolor: 'background.neutral',
            borderRadius: 1,
            mb: 1,
          }}
        >
          <Typography variant="body2">已选 {selectedTsCodes.length} 只股票</Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="solar:cart-3-bold" width={16} />}
            onClick={() => setWatchlistDialogOpen(true)}
          >
            加入自选股
          </Button>
          <Button
            size="small"
            variant="text"
            startIcon={<Iconify icon="solar:file-text-bold" width={16} />}
            onClick={handleCopyCodes}
          >
            复制代码
          </Button>
          <Button size="small" variant="text" onClick={() => setSelectedIds(new Set())}>
            取消选择
          </Button>
        </Stack>
      )}

      <Scrollbar sx={{ minHeight: 360 }}>
        <TableContainer sx={{ minWidth: 960 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    indeterminate={someSelected && !allSelected}
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </TableCell>
                <TableCell sx={{ minWidth: 64 }}>强度</TableCell>
                <TableCell sx={{ minWidth: 140 }}>股票</TableCell>
                <TableCell sx={{ minWidth: 120 }}>异动类型</TableCell>
                <TableCell align="right" sx={{ minWidth: 96 }}>
                  检测值
                </TableCell>
                <TableCell align="right" sx={{ minWidth: 72 }}>
                  阈值
                </TableCell>
                <TableCell sx={{ minWidth: 96 }}>状态</TableCell>
                <TableCell sx={{ minWidth: 100 }}>交易日</TableCell>
                <TableCell sx={{ minWidth: 132 }}>扫描时间</TableCell>
                <TableCell align="center" sx={{ minWidth: 120 }}>
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {showLoadingSkeleton &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={`sk-${i}`}>
                    <TableCell colSpan={10}>
                      <Skeleton variant="rectangular" height={36} />
                    </TableCell>
                  </TableRow>
                ))}
              {!showLoadingSkeleton &&
                !showError &&
                !showEmpty &&
                items.map((item) => {
                  const cfg = getAnomalyTypeConfig(item.anomalyType);
                  const severity =
                    item.severity ?? fallbackSeverity(item.anomalyType, item.value, item.threshold);
                  const sevMeta = getSeverityMeta(severity);
                  const isSelected = selectedIds.has(item.id);
                  const stockName = item.stockName ?? '--';
                  const isNew = item.isNew === true;
                  const continued = item.continuedDays ?? 0;

                  return (
                    <TableRow
                      key={item.id}
                      hover
                      selected={isSelected}
                      sx={{ '& td': { fontVariantNumeric: 'tabular-nums' } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onChange={() => toggleOne(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Label
                          color={sevMeta.color === 'default' ? 'default' : sevMeta.color}
                          variant="soft"
                        >
                          {sevMeta.label}
                        </Label>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Box
                            component={RouterLink}
                            href={`/stock/detail?code=${encodeURIComponent(item.tsCode)}`}
                            sx={{
                              color: 'primary.main',
                              textDecoration: 'none',
                              fontWeight: 600,
                              fontSize: 13,
                            }}
                          >
                            {item.tsCode}
                          </Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: 160 }}
                          >
                            {stockName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                          <Label color={cfg.color} variant="soft">
                            {cfg.label}
                          </Label>
                          {item.coincidentTypes && item.coincidentTypes.length > 0 ? (
                            <Tooltip
                              title={`同股同日还命中：${item.coincidentTypes
                                .map((t) => getAnomalyTypeConfig(t).label)
                                .join('、')}`}
                            >
                              <Box>
                                <Label color="info" variant="outlined">
                                  +{item.coincidentTypes.length}
                                </Label>
                              </Box>
                            </Tooltip>
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{ color: `${cfg.color}.main`, fontWeight: 600 }}
                        >
                          {formatAnomalyValue(item.anomalyType, item.value)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          {formatAnomalyThreshold(item.anomalyType, item.threshold)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {isNew ? (
                            <Label color="error" variant="soft">
                              新发
                            </Label>
                          ) : continued > 1 ? (
                            <Label color="warning" variant="soft">
                              连续 {continued} 日
                            </Label>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              --
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{fmtTradeDate(item.tradeDate)}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
                        {item.scannedAt ? fDateTime(item.scannedAt) : '--'}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="查看证据链">
                            <IconButton size="small" aria-label="查看证据链" onClick={() => onOpenDetail(item)}>
                              <Iconify icon="solar:eye-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="打开个股详情">
                            <IconButton
                              size="small"
                              aria-label="打开个股详情"
                              component={RouterLink}
                              href={`/stock/detail?code=${encodeURIComponent(item.tsCode)}`}
                            >
                              <Iconify icon="solar:share-bold" width={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Scrollbar>

      {showError && (
        <Box sx={{ p: 2 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={onRetry}>
                重试
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      )}

      {showEmpty && (
        <AnomalyEmptyState
          variant={hasFilters ? 'filter' : 'no-data'}
          onClearFilter={hasFilters ? onClearFilter : undefined}
          onSwitchLatest={onSwitchLatest}
          onScan={onScan}
          showScan={isAdmin}
        />
      )}

      <TablePagination
        component="div"
        count={total}
        page={pageIndex}
        rowsPerPage={pageSize}
        rowsPerPageOptions={ANOMALY_PAGE_SIZE_OPTIONS}
        onPageChange={(_e, newPage) => onPageChange(newPage)}
        onRowsPerPageChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
        labelRowsPerPage="每页"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} / 共 ${count} 条`}
        sx={{ borderTop: `1px solid ${theme.vars.palette.divider}` }}
      />

      <AnomalyAddWatchlistDialog
        open={watchlistDialogOpen}
        tsCodes={selectedTsCodes}
        onClose={() => setWatchlistDialogOpen(false)}
        onSuccess={handleAddWatchlistSuccess}
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={3500}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={feedback.severity}
          onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
