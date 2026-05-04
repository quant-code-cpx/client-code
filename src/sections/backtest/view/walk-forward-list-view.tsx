import type { ChangeEvent } from 'react';
import type { WalkForwardRunSummary, WalkForwardRunListResponse } from 'src/api/backtest';

import { useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import TablePagination from '@mui/material/TablePagination';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { listWalkForwardRuns, deleteWalkForwardRun } from 'src/api/backtest';

import { Iconify } from 'src/components/iconify';

import { WalkForwardListTable } from '../walk-forward-list-table';
import { WalkForwardListSummary } from '../walk-forward-list-summary';
import { WalkForwardListToolbar } from '../walk-forward-list-toolbar';

import type { WalkForwardListFilter } from '../walk-forward-list-toolbar';

// ----------------------------------------------------------------------

const DEFAULT_FILTER: WalkForwardListFilter = {
  q: '',
  statuses: [],
  strategyTypes: [],
  sortBy: 'createdAt',
  sortDir: 'desc',
};

function parseCsv(value: string | null) {
  return value?.split(',').filter(Boolean) ?? [];
}

function parsePage(value: string | null) {
  const page = Number(value);
  return Number.isFinite(page) && page > 0 ? page - 1 : 0;
}

function parsePageSize(value: string | null) {
  const pageSize = Number(value);
  return [10, 20, 50].includes(pageSize) ? pageSize : 20;
}

function hasActiveRun(rows: WalkForwardRunSummary[]) {
  return rows.some((row) => row.status === 'RUNNING' || row.status === 'QUEUED');
}

export function WalkForwardListView() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<WalkForwardRunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [aggregates, setAggregates] = useState<WalkForwardRunListResponse['aggregates']>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filter = useMemo<WalkForwardListFilter>(
    () => ({
      q: searchParams.get('q') ?? DEFAULT_FILTER.q,
      statuses: parseCsv(searchParams.get('statuses')),
      strategyTypes: parseCsv(searchParams.get('strategyTypes')),
      sortBy:
        (searchParams.get('sortBy') as WalkForwardListFilter['sortBy']) ?? DEFAULT_FILTER.sortBy,
      sortDir:
        (searchParams.get('sortDir') as WalkForwardListFilter['sortDir']) ?? DEFAULT_FILTER.sortDir,
    }),
    [searchParams]
  );
  const page = parsePage(searchParams.get('page'));
  const pageSize = parsePageSize(searchParams.get('pageSize'));

  const updateSearch = useCallback(
    (patch: Partial<WalkForwardListFilter> & { page?: number; pageSize?: number }) => {
      const nextFilter = { ...filter, ...patch };
      const next = new URLSearchParams();
      if (nextFilter.q.trim()) next.set('q', nextFilter.q.trim());
      if (nextFilter.statuses.length > 0) next.set('statuses', nextFilter.statuses.join(','));
      if (nextFilter.strategyTypes.length > 0) {
        next.set('strategyTypes', nextFilter.strategyTypes.join(','));
      }
      if (nextFilter.sortBy !== DEFAULT_FILTER.sortBy) next.set('sortBy', nextFilter.sortBy);
      if (nextFilter.sortDir !== DEFAULT_FILTER.sortDir) next.set('sortDir', nextFilter.sortDir);
      next.set('page', String((patch.page ?? 0) + 1));
      next.set('pageSize', String(patch.pageSize ?? pageSize));
      setSearchParams(next, { replace: true });
    },
    [filter, pageSize, setSearchParams]
  );

  const fetchRuns = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const res: WalkForwardRunListResponse = await listWalkForwardRuns({
          page: page + 1,
          pageSize,
          q: filter.q.trim() || undefined,
          statuses: filter.statuses,
          strategyTypes: filter.strategyTypes,
          sortBy: filter.sortBy,
          sortDir: filter.sortDir,
        });
        setRows(res.items ?? []);
        setTotal(res.total ?? 0);
        setAggregates(res.aggregates);
      } catch (err) {
        setRows([]);
        setAggregates(undefined);
        setError(err instanceof Error ? err.message : '加载 Walk-Forward 列表失败');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [filter, page, pageSize]
  );

  useEffect(() => {
    void fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (!hasActiveRun(rows)) return undefined;
    const timer = window.setInterval(() => {
      void fetchRuns(true);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [fetchRuns, rows]);

  const handlePageChange = (_: unknown, newPage: number) => {
    updateSearch({ page: newPage, pageSize });
  };

  const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateSearch({ page: 0, pageSize: Number(event.target.value) });
  };

  const handleReset = () => {
    setSearchParams(new URLSearchParams({ page: '1', pageSize: String(pageSize) }), {
      replace: true,
    });
  };

  const handleDelete = async (row: WalkForwardRunSummary) => {
    if (!window.confirm(`确认删除任务 ${row.name ?? row.wfRunId.slice(0, 8)}？`)) return;
    setError('');
    try {
      await deleteWalkForwardRun(row.wfRunId);
      await fetchRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除接口待后端支持，前端已保留操作入口');
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4">Walk-Forward 验证</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            通过滚动训练-测试窗口检验策略的样本外可重复性
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" width={20} />}
          onClick={() => router.push('/backtest/walk-forward/create')}
        >
          新建 WF 任务
        </Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <WalkForwardListSummary rows={rows} total={total} aggregates={aggregates} loading={loading} />

      <Card>
        <WalkForwardListToolbar
          filter={filter}
          onChange={(patch) => updateSearch({ ...patch, page: 0 })}
          onReset={handleReset}
          onRefresh={() => {
            void fetchRuns();
          }}
        />
        <WalkForwardListTable rows={rows} loading={loading} onDelete={handleDelete} />
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      </Card>
    </DashboardContent>
  );
}
