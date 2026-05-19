import type { AdminJobItem, AdminJobType, AdminJobStatus } from 'src/api/factor';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';
import TablePagination from '@mui/material/TablePagination';

import { fmtTradeDate } from 'src/utils/format-time';

import { adminJobList } from 'src/api/factor';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ADMIN_JOB_STATUS_META, ADMIN_JOB_TYPE_LABELS } from '../constants';
import { FactorAdminJobDetailDrawer } from './factor-admin-job-detail-drawer';

// ─── Types ────────────────────────────────────────────────────

type Props = {
  highlightJobId?: string | null;
};

const PAGE_SIZE = 20;

export function FactorAdminJobsTable({ highlightJobId }: Props) {
  const [items, setItems] = useState<AdminJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterStatus, setFilterStatus] = useState<AdminJobStatus | ''>('');
  const [filterType, setFilterType] = useState<AdminJobType | ''>('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<AdminJobItem | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminJobList({
        page: page + 1,
        pageSize: PAGE_SIZE,
        status: filterStatus || undefined,
        type: filterType || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setError('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const hasRunning = items.some((j) => j.status === 'RUNNING' || j.status === 'PENDING');

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>类型</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as AdminJobType | '');
              setPage(0);
            }}
            label="类型"
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="PRECOMPUTE">预计算</MenuItem>
            <MenuItem value="BACKFILL">历史回补</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>状态</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as AdminJobStatus | '');
              setPage(0);
            }}
            label="状态"
          >
            <MenuItem value="">全部</MenuItem>
            {(Object.keys(ADMIN_JOB_STATUS_META) as AdminJobStatus[]).map((s) => (
              <MenuItem key={s} value={s}>
                {ADMIN_JOB_STATUS_META[s].label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          size="small"
          variant="outlined"
          onClick={fetchJobs}
          startIcon={<Iconify icon="solar:refresh-bold" />}
        >
          刷新
        </Button>
        {hasRunning && (
          <Chip
            label="有任务进行中（5s 轮询）"
            size="small"
            color="info"
            icon={<Iconify icon="solar:close-circle-bold" />}
          />
        )}
      </Stack>

      {loading && <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />}
      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>任务 ID</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>触发人</TableCell>
                  <TableCell>目标日期 / 区间</TableCell>
                  <TableCell align="right">因子数</TableCell>
                  <TableCell>进度</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>耗时</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        暂无任务记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {items.map((job) => {
                  const sm = ADMIN_JOB_STATUS_META[job.status] ?? {
                    label: job.status,
                    color: 'default' as const,
                  };
                  // FIX-024: 后端任务列表中 progress 字段可能缺失，做防御性兜底
                  const progress = job.progress ?? { done: 0, total: 0 };
                  const pct =
                    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
                  const isHighlight = highlightJobId === job.jobId;
                  const durationSec =
                    job.durationMs != null ? Math.round(job.durationMs / 1000) : null;

                  return (
                    <TableRow
                      key={job.jobId}
                      hover
                      sx={isHighlight ? { bgcolor: 'action.selected' } : undefined}
                    >
                      <TableCell
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: 12,
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Tooltip title={job.jobId}>
                          <span>{job.jobId.slice(0, 12)}…</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={ADMIN_JOB_TYPE_LABELS[job.type] ?? job.type}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{job.operator}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {job.tradeDate
                          ? fmtTradeDate(job.tradeDate)
                          : job.startDate && job.endDate
                            ? `${fmtTradeDate(job.startDate)} ~ ${fmtTradeDate(job.endDate)}`
                            : '—'}
                      </TableCell>
                      <TableCell align="right">{job.factorCount}</TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        {job.status === 'RUNNING' || job.status === 'PENDING' ? (
                          <Box>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ mb: 0.25, height: 4, borderRadius: 2 }}
                            />
                            <Typography variant="caption">
                              {progress.done}/{progress.total}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2">
                            {progress.done}/{progress.total}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Label color={sm.color} variant="soft">
                          {sm.label}
                        </Label>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {durationSec != null ? `${durationSec}s` : '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {new Date(job.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setDetailJob(job);
                            setDetailOpen(true);
                          }}
                        >
                          <Iconify icon="solar:eye-bold" width={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onPageChange={(_, p) => setPage(p)}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          />
        </>
      )}

      <FactorAdminJobDetailDrawer
        open={detailOpen}
        job={detailJob}
        onClose={() => setDetailOpen(false)}
        onJobRetried={(newJobId) => {
          setDetailOpen(false);
          fetchJobs();
          // Could emit newJobId upward to highlight
        }}
        onJobCancelled={fetchJobs}
      />
    </Box>
  );
}
