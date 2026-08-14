import type {
  SyncLogItem,
  SyncLogQuery,
  TushareSyncStatus,
  SyncLogSummaryItem,
} from 'src/api/tushare-sync';

import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';

import { fDateTime, fmtTradeDate } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { DatePicker } from 'src/components/date-picker';

import { SyncLogSummaryCards } from './sync-log-summary-cards';

const SYNC_STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  SKIPPED: 'warning',
};

const SYNC_STATUS_LABEL: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
  SKIPPED: '跳过',
};

type Props = { refreshKey?: number; initialFilters?: Pick<SyncLogQuery, 'task' | 'status' | 'startDate' | 'endDate'> };
function formatPayload(payload: Record<string, unknown> | null): string {
  if (!payload) return '';
  return JSON.stringify(payload, null, 2);
}
export function SyncLogTab({ refreshKey = 0, initialFilters }: Props) {
  const [summary, setSummary] = useState<SyncLogSummaryItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [filterTask, setFilterTask] = useState(initialFilters?.task ?? '');
  const [filterStatus, setFilterStatus] = useState(initialFilters?.status ?? '');
  const [startDate, setStartDate] = useState(initialFilters?.startDate ?? '');
  const [endDate, setEndDate] = useState(initialFilters?.endDate ?? '');
  const [appliedFilters, setAppliedFilters] = useState({
    task: initialFilters?.task ?? '',
    status: initialFilters?.status ?? '',
    startDate: initialFilters?.startDate ?? '',
    endDate: initialFilters?.endDate ?? '',
  });
  const initialFilterKey = [
    initialFilters?.task ?? '',
    initialFilters?.status ?? '',
    initialFilters?.startDate ?? '',
    initialFilters?.endDate ?? '',
  ].join('|');
  const previousInitialFilterKey = useRef(initialFilterKey);
  const [payloadDrawer, setPayloadDrawer] = useState<SyncLogItem | null>(null);

  const successCount = summary.filter((s) => s.lastStatus === 'SUCCESS').length;
  const failedCount = summary.filter((s) => s.lastStatus === 'FAILED').length;
  const skippedCount = summary.filter((s) => s.lastStatus === 'SKIPPED').length;
  const warningCount = summary.filter((s) => s.consecutiveFailures > 0).length;

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await tushareSyncApi.getSyncLogsSummary();
      setSummary(data);
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : '获取同步日志摘要失败');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const result = await tushareSyncApi.getSyncLogs({
        task: appliedFilters.task || undefined,
        status: (appliedFilters.status as TushareSyncStatus) || undefined,
        startDate: appliedFilters.startDate || undefined,
        endDate: appliedFilters.endDate || undefined,
        page: page + 1,
        pageSize,
      });
      setLogs(result.items);
      setTotal(result.total);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : '获取同步日志失败');
    } finally {
      setLogsLoading(false);
    }
  }, [page, pageSize, appliedFilters]);

  useEffect(() => {
    if (initialFilterKey === previousInitialFilterKey.current) return;
    previousInitialFilterKey.current = initialFilterKey;
    const nextFilters = {
      task: initialFilters?.task ?? '',
      status: initialFilters?.status ?? '',
      startDate: initialFilters?.startDate ?? '',
      endDate: initialFilters?.endDate ?? '',
    };
    setFilterTask(nextFilters.task);
    setFilterStatus(nextFilters.status);
    setStartDate(nextFilters.startDate);
    setEndDate(nextFilters.endDate);
    setAppliedFilters(nextFilters);
    setPage(0);
  }, [
    initialFilterKey,
    initialFilters?.task,
    initialFilters?.status,
    initialFilters?.startDate,
    initialFilters?.endDate,
  ]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshKey]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshKey]);

  const handleSearch = () => {
    setPage(0);
    setAppliedFilters({
      task: filterTask,
      status: filterStatus,
      startDate,
      endDate,
    });
  };

  const handleTodayFilter = () => {
    const today = dayjs().format('YYYY-MM-DD');
    setStartDate(today);
    setEndDate(today);
    setAppliedFilters({ task: filterTask, status: filterStatus, startDate: today, endDate: today });
    setPage(0);
  };

  const handleRecentFilter = () => {
    setStartDate(dayjs().subtract(6, 'day').format('YYYY-MM-DD'));
    setEndDate(dayjs().format('YYYY-MM-DD'));
    setAppliedFilters({
      task: filterTask,
      status: filterStatus,
      startDate: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
    });
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilterTask('');
    setFilterStatus('');
    setStartDate('');
    setEndDate('');
    setAppliedFilters({ task: '', status: '', startDate: '', endDate: '' });
    setPage(0);
  };

  return (
    <Box sx={{ mt: 3 }}>
      {summaryError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchSummary}>
              重试
            </Button>
          }
        >
          {summaryError}
          {summary.length > 0 ? '，当前展示上次成功快照。' : ''}
        </Alert>
      )}

      <SyncLogSummaryCards
        loading={summaryLoading}
        hasError={Boolean(summaryError)}
        hasSnapshot={summary.length > 0}
        successCount={successCount}
        failedCount={failedCount}
        skippedCount={skippedCount}
        warningCount={warningCount}
      />

      <Card>
        <Box sx={{ px: 3, py: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            sx={{ mb: 2 }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                同步日志详情
              </Typography>
              <Typography variant="caption" color="text.secondary">
                快捷过滤 + 高级字段组合，payload 可展开查看。
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Chip label="今天" clickable variant="outlined" onClick={handleTodayFilter} />
            <Chip
              label="失败"
              clickable
              color={filterStatus === 'FAILED' ? 'error' : 'default'}
              variant="outlined"
              onClick={() => {
                setFilterStatus('FAILED');
                setAppliedFilters({
                  task: filterTask,
                  status: 'FAILED',
                  startDate,
                  endDate,
                });
                setPage(0);
              }}
            />
            <Chip label="近 7 天" clickable variant="outlined" onClick={handleRecentFilter} />
            <Chip label="清空" clickable variant="outlined" onClick={handleClearFilters} />
          </Stack>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mb: 2, flexWrap: 'wrap' }}
          >
            <TextField
              size="small"
              label="任务类型"
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              placeholder="如 DAILY"
              sx={{ minWidth: 160 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="sync-log-status-label">状态</InputLabel>
              <Select
                id="sync-log-status"
                labelId="sync-log-status-label"
                label="状态"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="">全部</MenuItem>
                <MenuItem value="SUCCESS">成功</MenuItem>
                <MenuItem value="FAILED">失败</MenuItem>
                <MenuItem value="SKIPPED">跳过</MenuItem>
              </Select>
            </FormControl>
            <DatePicker
              label="开始日期"
              value={startDate ? dayjs(startDate) : null}
              onChange={(v) => setStartDate(v?.format('YYYY-MM-DD') ?? '')}
            />
            <DatePicker
              label="结束日期"
              value={endDate ? dayjs(endDate) : null}
              onChange={(v) => setEndDate(v?.format('YYYY-MM-DD') ?? '')}
            />
            <Button variant="contained" size="small" onClick={handleSearch}>
              查询
            </Button>
          </Stack>
        </Box>

        {logsLoading && logs.length > 0 && (
          <LinearProgress aria-label="同步日志更新中" />
        )}
        {logsError && (
          <Alert
            severity="error"
            sx={{ mx: 3, mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={fetchLogs}>
                重试
              </Button>
            }
          >
            {logsError}
            {logs.length > 0 ? '，当前展示上次成功快照。' : ''}
          </Alert>
        )}

        {/* 日志表格 */}
        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>任务</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>交易日</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>消息</TableCell>
                  <TableCell>参数</TableCell>
                  <TableCell>开始时间</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>结束时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logsLoading && logs.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton width={100} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={60} height={22} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={80} />
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Skeleton width={200} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={72} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={130} />
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Skeleton width={130} />
                        </TableCell>
                      </TableRow>
                    ))
                  : logs.map((log) => (
                      <TableRow key={log.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {log.task}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Label color={SYNC_STATUS_COLOR[log.status] ?? 'default'} variant="soft">
                            {SYNC_STATUS_LABEL[log.status] ?? log.status}
                          </Label>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {log.tradeDate ? fmtTradeDate(log.tradeDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'text.secondary',
                              maxWidth: 280,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.message ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {log.payload ? (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => setPayloadDrawer(log)}
                            >
                              查看 ({formatPayload(log.payload).length})
                            </Button>
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {fDateTime(log.startedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {log.finishedAt ? fDateTime(log.finishedAt) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                {!logsLoading && !logsError && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        暂无同步日志记录
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
          rowsPerPageOptions={[20]}
          onPageChange={(_, newPage) => setPage(newPage)}
          labelRowsPerPage="每页"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} / 共 ${count !== -1 ? count : `超过 ${to}`} 条`
          }
        />
      </Card>

      <Drawer anchor="right" open={payloadDrawer !== null} onClose={() => setPayloadDrawer(null)}>
        <Box sx={{ width: { xs: 320, sm: 480 }, p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6">任务参数</Typography>
              <Typography variant="caption" color="text.secondary">
                {payloadDrawer?.task ?? '—'}
              </Typography>
            </Box>
            <Tooltip title="关闭 payload 抽屉">
              <IconButton onClick={() => setPayloadDrawer(null)} aria-label="关闭 payload 抽屉">
                <Iconify icon="solar:close-circle-bold" />
              </IconButton>
            </Tooltip>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              fontSize: 13,
              bgcolor: 'background.neutral',
              color: 'text.primary',
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
            }}
          >
            {formatPayload(payloadDrawer?.payload ?? null) || '—'}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}
