import type { SyncLogItem, TushareSyncStatus, SyncLogSummaryItem } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { fDateTime } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';

import { SyncLogSummaryTable } from './sync-log-summary-table';

// ----------------------------------------------------------------------

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

// ----------------------------------------------------------------------

export function SyncLogTab() {
  // 总览数据
  const [summary, setSummary] = useState<SyncLogSummaryItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // 日志列表
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // 过滤条件
  const [filterTask, setFilterTask] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 统计卡片数据（from summary）
  const successCount = summary.filter((s) => s.lastStatus === 'SUCCESS').length;
  const failedCount = summary.filter((s) => s.lastStatus === 'FAILED').length;
  const skippedCount = summary.filter((s) => s.lastStatus === 'SKIPPED').length;
  const warningCount = summary.filter((s) => s.consecutiveFailures > 0).length;

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await tushareSyncApi.getSyncLogsSummary();
      setSummary(data);
    } catch {
      // ignore
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const result = await tushareSyncApi.getSyncLogs({
        task: filterTask || undefined,
        status: (filterStatus as TushareSyncStatus) || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: page + 1,
        pageSize,
      });
      setLogs(result.items);
      setTotal(result.total);
    } catch {
      // ignore
    } finally {
      setLogsLoading(false);
    }
  }, [page, filterTask, filterStatus, startDate, endDate, pageSize]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* 统计卡片 */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 2 }}>
        {[
          { label: '成功任务数', value: successCount, color: 'success.main' },
          { label: '失败任务数', value: failedCount, color: 'error.main' },
          { label: '跳过任务数', value: skippedCount, color: 'warning.main' },
          { label: '连续失败告警', value: warningCount, color: 'error.dark' },
        ].map((card) => (
          <Card key={card.label} sx={{ p: 3, flex: '1 1 180px', minWidth: 160 }}>
            {summaryLoading ? (
              <Skeleton variant="rectangular" height={56} />
            ) : (
              <Box>
                <Typography variant="h3" sx={{ color: card.color }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {card.label}
                </Typography>
              </Box>
            )}
          </Card>
        ))}
      </Stack>

      {/* 各任务最后状态汇总 */}
      <Card sx={{ mb: 3 }}>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            各任务最后同步状态
          </Typography>
        </Box>
        <SyncLogSummaryTable rows={summary} loading={summaryLoading} />
      </Card>

      {/* 日志过滤 */}
      <Card>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            同步日志详情
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              label="任务类型"
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              placeholder="如 DAILY"
              sx={{ minWidth: 160 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>状态</InputLabel>
              <Select
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
            <TextField
              size="small"
              label="开始日期"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small"
              label="结束日期"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <Button variant="contained" size="small" onClick={handleSearch}>
              查询
            </Button>
          </Stack>
        </Box>

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
                  <TableCell>开始时间</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>结束时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logsLoading
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
                          <Label
                            color={SYNC_STATUS_COLOR[log.status] ?? 'default'}
                            variant="soft"
                          >
                            {SYNC_STATUS_LABEL[log.status] ?? log.status}
                          </Label>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {log.tradeDate ?? '—'}
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
                {!logsLoading && logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
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
    </Box>
  );
}
