import type { BacktestRunListItem, BacktestRunListResponse } from 'src/api/backtest';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { listRuns, cancelRun, getRunDetail } from 'src/api/backtest';

import { Iconify } from 'src/components/iconify';

import { useBacktestRunWs } from '../hooks/use-backtest-run-ws';
import { BacktestRunListTable } from '../backtest-run-list-table';
import { BacktestRunListKpiBar } from '../backtest-run-list-kpi-bar';
import { BacktestRunListToolbar } from '../backtest-run-list-toolbar';
import { BacktestRunListBulkBar } from '../backtest-run-list-bulk-bar';
import {
  toRunListQuery,
  isInvalidDateRange,
  useBacktestRunListState,
} from '../hooks/use-backtest-run-list-state';

// ----------------------------------------------------------------------

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
};

function buildCopyState(detail: Awaited<ReturnType<typeof getRunDetail>>) {
  return {
    templateId: detail.strategyType,
    strategyType: detail.strategyType,
    name: detail.name ? `${detail.name}（复制）` : '复制回测任务',
    startDate: detail.startDate,
    endDate: detail.endDate,
    benchmarkTsCode: detail.benchmarkTsCode,
    universe: detail.universe,
    initialCapital: detail.initialCapital,
    rebalanceFrequency: detail.rebalanceFrequency,
    priceMode: detail.priceMode,
    strategyConfig: detail.strategyConfig,
  };
}

export function BacktestRunListView() {
  const router = useRouter();
  const { state, setFilter, setPage, setPageSize, setSort, clearFilters } =
    useBacktestRunListState();
  const { filter, page, pageSize, sort, highlightRunId } = state;

  const [result, setResult] = useState<BacktestRunListResponse | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'info',
  });

  const invalidDateRange = isInvalidDateRange(filter);
  const query = useMemo(() => toRunListQuery(state), [state]);
  const queryKey = useMemo(() => JSON.stringify(query), [query]);

  const showSnackbar = useCallback(
    (message: string, severity: SnackbarState['severity'] = 'info') => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const patchRun = useCallback((runId: string, patch: Partial<BacktestRunListItem>) => {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) => (item.runId === runId ? { ...item, ...patch } : item)),
      };
    });
  }, []);

  const fetchRuns = useCallback(async () => {
    if (invalidDateRange) return;

    setLoading(true);
    setError('');
    try {
      const data = await listRuns(query);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取回测列表失败');
    } finally {
      setLoading(false);
    }
  }, [invalidDateRange, query]);

  useEffect(() => {
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, invalidDateRange]);

  useBacktestRunWs({
    items: result?.items ?? [],
    onPatch: patchRun,
    onRefresh: fetchRuns,
    disabled: invalidDateRange,
  });

  const handleView = (runId: string) => {
    router.push(`/backtest/runs/${runId}`);
  };

  const handleCopy = async (item: BacktestRunListItem) => {
    try {
      const detail = await getRunDetail(item.runId);
      router.push('/backtest', { state: buildCopyState(detail) });
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : '复制重跑参数加载失败', 'error');
    }
  };

  const handleCancel = async (item: BacktestRunListItem) => {
    try {
      await cancelRun(item.runId);
      patchRun(item.runId, { status: 'CANCELLED', progress: item.progress });
      showSnackbar('任务已取消', 'success');
      fetchRuns();
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : '取消任务失败', 'error');
    }
  };

  const handleToggleSelect = (runId: string) => {
    setSelectedRunIds((prev) =>
      prev.includes(runId) ? prev.filter((item) => item !== runId) : [...prev, runId]
    );
  };

  const handleToggleSelectAll = (runIds: string[], checked: boolean) => {
    setSelectedRunIds((prev) => {
      if (!checked) return prev.filter((runId) => !runIds.includes(runId));
      return [...new Set([...prev, ...runIds])];
    });
  };

  const handleAddComparison = () => {
    router.push('/backtest/comparison/create', { state: { sourceRunIds: selectedRunIds } });
    showSnackbar('已带入选中 runId；对比页预填待后续联动增强', 'info');
  };

  const handleFailedReasonClick = (code: string) => {
    showSnackbar(`后端支持 failedReasonCode 后将筛选：${code}`, 'info');
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">回测历史</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            追踪任务状态、快速定位失败原因，并把高价值回测沉淀到对比和报告流程。
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          href="/backtest"
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
        >
          新建回测
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchRuns}>
              重试
            </Button>
          }
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <BacktestRunListKpiBar
          items={result?.items ?? []}
          total={result?.total ?? 0}
          loading={loading}
          onFailedReasonClick={handleFailedReasonClick}
        />
      </Box>

      <Card>
        <BacktestRunListToolbar
          filter={filter}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
          onRefresh={fetchRuns}
          loading={loading}
        />

        <BacktestRunListBulkBar
          selectedCount={selectedRunIds.length}
          onClear={() => setSelectedRunIds([])}
          onAddComparison={handleAddComparison}
          onArchive={() => showSnackbar('归档需要后端端点支持', 'warning')}
          onDelete={() => showSnackbar('批量删除需要后端软删除端点支持', 'warning')}
          onTag={() => showSnackbar('批量打标签需要后端 tags 端点支持', 'warning')}
        />

        <BacktestRunListTable
          items={result?.items ?? []}
          total={result?.total ?? 0}
          page={page}
          pageSize={pageSize}
          loading={loading}
          sort={sort}
          selectedRunIds={selectedRunIds}
          highlightRunId={highlightRunId}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSort={setSort}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
          onView={handleView}
          onCopy={handleCopy}
          onCancel={handleCancel}
          onUnsupportedAction={(message) => showSnackbar(message, 'warning')}
        />
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
