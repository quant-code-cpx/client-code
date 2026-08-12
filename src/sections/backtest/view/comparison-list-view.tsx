import type { ComparisonListResponse } from 'src/api/backtest';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import TablePagination from '@mui/material/TablePagination';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { listComparisons } from 'src/api/backtest';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STATUS_LABEL, STATUS_OPTIONS } from '../constants';
import { ComparisonListCard } from '../comparison-list-card';

// ----------------------------------------------------------------------

const EMPTY_RESULT: ComparisonListResponse = {
  page: 1,
  pageSize: 12,
  total: 0,
  items: [],
};

function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function isRunningStatus(status: string) {
  return status === 'QUEUED' || status === 'RUNNING';
}

export function ComparisonListView() {
  const router = useRouter();

  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [result, setResult] = useState<ComparisonListResponse>(EMPTY_RESULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const query = useMemo(
    () => ({
      page: page + 1,
      pageSize,
      status: status || undefined,
      keyword: keyword.trim() || undefined,
    }),
    [keyword, page, pageSize, status]
  );
  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  const kpis = useMemo(() => {
    const items = result.items;
    const runningCount = items.filter((item) => isRunningStatus(item.status)).length;
    const completedCount = items.filter((item) => item.status === 'COMPLETED').length;
    const failedCount = items.filter((item) => item.status === 'FAILED').length;
    const avgStrategyCount = items.length
      ? items.reduce((sum, item) => sum + item.strategyCount, 0) / items.length
      : 0;

    return [
      { label: '总任务', value: String(result.total), color: 'info' as const },
      { label: '运行中', value: String(runningCount), color: 'warning' as const },
      { label: '已完成', value: String(completedCount), color: 'success' as const },
      {
        label: '失败率',
        value: formatRate(items.length ? failedCount / items.length : 0),
        color: 'error' as const,
      },
      {
        label: '平均策略数',
        value: avgStrategyCount ? avgStrategyCount.toFixed(1) : '—',
        color: 'default' as const,
      },
    ];
  }, [result.items, result.total]);

  const fetchComparisons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listComparisons(query);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取多策略对比列表失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchComparisons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const handleView = (groupId: string) => {
    router.push(`/backtest/comparison/${groupId}`);
  };

  return (
    <DashboardContent>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">多策略对比 · 历史</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            复盘历史对比、取消跑错的任务，并把上一次实验配置复制回来继续迭代。
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            component={RouterLink}
            href="/backtest"
            variant="outlined"
            startIcon={<Iconify icon="solar:widget-bold" width={18} />}
          >
            回测工作台
          </Button>
          <Button
            component={RouterLink}
            href="/backtest/comparison/create"
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          >
            新建对比
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchComparisons}>
              重试
            </Button>
          }
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      ) : null}

      <Alert severity="info" sx={{ mb: 3 }}>
        对比列表与已产出详情可正常查看；复制配置、取消和删除能力尚未开放。
      </Alert>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, md: 2.4 }}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {item.label}
                    </Typography>
                    <Typography variant="h5" sx={{ mt: 0.5 }}>
                      {item.value}
                    </Typography>
                  </Box>
                  <Label color={item.color} variant="soft">
                    {item.label === '运行中' ? STATUS_LABEL.RUNNING : item.label}
                  </Label>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>状态</InputLabel>
              <Select
                label="状态"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(0);
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value || 'ALL'} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="关键字搜索"
              placeholder="输入对比名称 / 策略标签"
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(0);
              }}
            />

            <Button
              variant="outlined"
              onClick={fetchComparisons}
              disabled={loading}
              startIcon={<Iconify icon="solar:restart-bold" width={18} />}
              sx={{ flexShrink: 0 }}
            >
              刷新
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: pageSize }).map((_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, lg: 3 }}>
              <Skeleton variant="rounded" height={220} />
            </Grid>
          ))}
        </Grid>
      ) : result.items.length ? (
        <>
          <Grid container spacing={2.5}>
            {result.items.map((item) => (
              <Grid key={item.groupId} size={{ xs: 12, sm: 6, lg: 3 }}>
                <ComparisonListCard item={item} onView={handleView} />
              </Grid>
            ))}
          </Grid>

          <TablePagination
            component="div"
            count={result.total}
            page={page}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[12, 20, 40]}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
          />
        </>
      ) : (
        <Card>
          <CardContent>
            <Stack spacing={2} alignItems="center" sx={{ py: 6, textAlign: 'center' }}>
              <Iconify icon="solar:copy-bold" width={48} sx={{ color: 'text.disabled' }} />
              <Box>
                <Typography variant="h6">还没有对比任务</Typography>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
                  从一个策略想法开始，挑几个候选模型放到同一张桌上比较。
                </Typography>
              </Box>
              <Button
                component={RouterLink}
                href="/backtest/comparison/create"
                variant="contained"
                startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
              >
                新建对比
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </DashboardContent>
  );
}
