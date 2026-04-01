import type { BacktestRunListItem, BacktestRunListResponse } from 'src/api/backtest';
import type { RunListFilter } from '../backtest-run-list-toolbar';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { listRuns } from 'src/api/backtest';
import { DashboardContent } from 'src/layouts/dashboard';

import { BacktestRunListToolbar } from '../backtest-run-list-toolbar';
import { BacktestRunListTable } from '../backtest-run-list-table';

// ----------------------------------------------------------------------

export function BacktestRunListView() {
  const router = useRouter();

  const [filter, setFilter] = useState<RunListFilter>({
    status: '',
    strategyType: '',
    keyword: '',
    dateRange: 'all',
  });

  const [result, setResult] = useState<BacktestRunListResponse | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRuns = useCallback(
    async (overridePage?: number) => {
      setLoading(true);
      setError('');
      try {
        const data = await listRuns({
          page: (overridePage ?? page) + 1,
          pageSize,
          status: filter.status || undefined,
          strategyType: filter.strategyType || undefined,
          keyword: filter.keyword || undefined,
        });
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取回测列表失败');
      } finally {
        setLoading(false);
      }
    },
    [filter, page, pageSize]
  );

  useEffect(() => {
    fetchRuns(0);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, pageSize]);

  useEffect(() => {
    if (result !== null) {
      fetchRuns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleView = (runId: string) => {
    router.push(`/backtest/runs/${runId}`);
  };

  const handleCopy = (item: BacktestRunListItem) => {
    // Navigate to workbench and prefill via router state
    router.push('/backtest', {
      state: {
        templateId: item.strategyType,
        strategyType: item.strategyType,
      },
    });
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          回测历史
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <BacktestRunListToolbar
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
          }}
          onRefresh={() => fetchRuns(0)}
          loading={loading}
        />

        <BacktestRunListTable
          items={result?.items ?? []}
          total={result?.total ?? 0}
          page={page}
          pageSize={pageSize}
          loading={loading}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(0);
          }}
          onView={handleView}
          onCopy={handleCopy}
        />
      </Card>
    </DashboardContent>
  );
}
