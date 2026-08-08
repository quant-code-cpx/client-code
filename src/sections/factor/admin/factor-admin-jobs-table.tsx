import type { AdminJobItem, AdminBatchStatus } from 'src/api/factor';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
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
import TablePagination from '@mui/material/TablePagination';

import { fmtTradeDate } from 'src/utils/format-time';

import { adminJobList } from 'src/api/factor';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { FactorAdminJobDetailDrawer } from './factor-admin-job-detail-drawer';

const PAGE_SIZE = 20;
const STATUS_META: Record<
  AdminBatchStatus,
  { label: string; color: 'success' | 'warning' | 'default' }
> = {
  HEALTHY: { label: '健康', color: 'success' },
  STALE: { label: '滞后', color: 'warning' },
  OLD: { label: '历史', color: 'default' },
};

export function FactorAdminJobsTable() {
  const [items, setItems] = useState<AdminJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailJob, setDetailJob] = useState<AdminJobItem | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminJobList({ page: page + 1, pageSize: PAGE_SIZE });
      setItems(response.items);
      setTotal(response.total);
    } catch {
      setError('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" alignItems="center">
        <FormControl size="small" sx={{ minWidth: 120 }} disabled>
          <InputLabel>类型</InputLabel>
          <Select value="" label="类型">
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="FACTOR_PRECOMPUTE">预计算</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 130 }} disabled>
          <InputLabel>状态</InputLabel>
          <Select value="" label="状态">
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="HEALTHY">健康</MenuItem>
            <MenuItem value="STALE">滞后</MenuItem>
            <MenuItem value="OLD">历史</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" color="text.secondary">
          服务端当前仅支持分页，类型/状态筛选暂不可用
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => void fetchJobs()}
          startIcon={<Iconify icon="solar:refresh-bold" />}
          sx={{ ml: 'auto' }}
        >
          刷新
        </Button>
      </Stack>

      {loading ? <Skeleton variant="rectangular" height={280} /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && !error ? (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>批次交易日</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>触发来源</TableCell>
                  <TableCell align="right">因子数</TableCell>
                  <TableCell align="right">样本总量</TableCell>
                  <TableCell align="right">缺失样本</TableCell>
                  <TableCell align="right">覆盖率</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>更新时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        暂无批次记录
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
                {items.map((job) => {
                  const statusMeta = STATUS_META[job.status];
                  return (
                    <TableRow key={job.tradeDate} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtTradeDate(job.tradeDate)}
                      </TableCell>
                      <TableCell>预计算批次</TableCell>
                      <TableCell>{job.operator || '—'}</TableCell>
                      <TableCell align="right">{job.factorCount.toLocaleString()}</TableCell>
                      <TableCell align="right">{job.totalStocks.toLocaleString()}</TableCell>
                      <TableCell align="right">{job.missingStocks.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        {(job.coverageRate * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <Label color={statusMeta.color} variant="soft">
                          {statusMeta.label}
                        </Label>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {job.latestSyncedAt
                          ? new Date(job.latestSyncedAt).toLocaleString('zh-CN')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="查看批次详情">
                          <IconButton
                            size="small"
                            aria-label={`查看 ${job.tradeDate} 批次详情`}
                            onClick={() => {
                              setDetailJob(job);
                              setDetailOpen(true);
                            }}
                          >
                            <Iconify icon="solar:eye-bold" width={16} />
                          </IconButton>
                        </Tooltip>
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
            onPageChange={(_, nextPage) => setPage(nextPage)}
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          />
        </>
      ) : null}

      <FactorAdminJobDetailDrawer
        open={detailOpen}
        job={detailJob}
        onClose={() => setDetailOpen(false)}
      />
    </Box>
  );
}
