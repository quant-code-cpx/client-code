import type { RetryQueueItem, TushareSyncRetryStatus } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import DialogContentText from '@mui/material/DialogContentText';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Iconify } from 'src/components/iconify';

import { RetryQueueTable } from './retry-queue-table';

// ----------------------------------------------------------------------

type Props = {
  isReadOnly?: boolean;
  refreshKey?: number;
};

export function RetryQueueTab({ isReadOnly = false, refreshKey = 0 }: Props) {
  const [retryItems, setRetryItems] = useState<RetryQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTask, setFilterTask] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [resetting, setResetting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetAlert, setResetAlert] = useState('');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tushareSyncApi.getRetryQueue(
        (filterStatus as TushareSyncRetryStatus) || undefined,
        page + 1,
        pageSize
      );
      setRetryItems(result.items);
      setTotal(result.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, pageSize]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue, refreshKey]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterStatus, filterTask, page]);

  const handleReset = async () => {
    if (isReadOnly) return;
    setConfirmOpen(false);
    setResetting(true);
    setResetAlert('');
    try {
      const res = await tushareSyncApi.resetRetryQueue();
      setResetAlert(`已重置 ${res.count} 条耗尽记录为等待重试`);
      fetchQueue();
    } catch (err) {
      setResetAlert(err instanceof Error ? err.message : '重置失败，请重试');
    } finally {
      setResetting(false);
    }
  };

  const filteredItems = retryItems.filter((item) =>
    item.task.toLowerCase().includes(filterTask.trim().toLowerCase())
  );
  const visibleIds = filteredItems.map((item) => item.id);
  const actionDisabledReason = isReadOnly
    ? '仅 SUPER_ADMIN 可执行'
    : '等待后端单条/批量队列接口启用';

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allVisibleSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  return (
    <Box sx={{ mt: 3 }}>
      {resetAlert && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setResetAlert('')}>
          {resetAlert}
        </Alert>
      )}

      <Card>
        <Box
          sx={{
            px: 3,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            失败重试队列
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              size="small"
              label="任务名搜索"
              value={filterTask}
              onChange={(event) => {
                setFilterTask(event.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 180 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>状态过滤</InputLabel>
              <Select
                label="状态过滤"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="PENDING">等待重试 (PENDING)</MenuItem>
                <MenuItem value="RETRYING">重试中 (RETRYING)</MenuItem>
                <MenuItem value="EXHAUSTED">已耗尽 (EXHAUSTED)</MenuItem>
                <MenuItem value="SUCCEEDED">已成功 (SUCCEEDED)</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title={isReadOnly ? '仅 SUPER_ADMIN 可执行' : ''}>
              <span>
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  onClick={() => setConfirmOpen(true)}
                  disabled={resetting || isReadOnly}
                  startIcon={
                    resetting ? (
                      <CircularProgress size={14} />
                    ) : (
                      <Iconify icon="solar:refresh-bold" />
                    )
                  }
                >
                  {resetting ? '重置中...' : '重置耗尽记录'}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>

        <Divider />

        {selectedIds.size > 0 && (
          <Alert
            severity="info"
            sx={{ mx: 3, mt: 2 }}
            action={
              <Stack direction="row" spacing={1}>
                <Tooltip title={actionDisabledReason}>
                  <span>
                    <Button size="small" disabled>
                      批量重试
                    </Button>
                  </span>
                </Tooltip>
                <Tooltip title={actionDisabledReason}>
                  <span>
                    <Button size="small" color="error" disabled>
                      批量删除
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            }
          >
            已选择 {selectedIds.size} 条重试记录
          </Alert>
        )}

        <RetryQueueTable
          rows={filteredItems}
          loading={loading}
          selectedIds={selectedIds}
          actionDisabled
          actionDisabledReason={actionDisabledReason}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />

        <TablePagination
          component="div"
          count={filterTask ? filteredItems.length : total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[20]}
          onPageChange={(_, newPage) => setPage(newPage)}
          labelRowsPerPage="每页"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} / 共 ${count !== -1 ? count : `超过 ${to}`} 条`
          }
        />
      </Card>

      {/* 确认对话框 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>确认重置耗尽记录</DialogTitle>
        <DialogContent>
          <DialogContentText>
            将把所有 <strong>EXHAUSTED</strong>（已耗尽）状态的重试记录重置为{' '}
            <strong>PENDING</strong>（等待重试），使其重新进入重试队列。确定继续？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button onClick={handleReset} color="warning" variant="contained" disabled={isReadOnly}>
            确认重置
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
