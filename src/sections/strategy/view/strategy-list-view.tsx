import type { Strategy } from 'src/api/strategy';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { cloneStrategy, createStrategy, deleteStrategy, listStrategies } from 'src/api/strategy';

import { Iconify } from 'src/components/iconify';

import { StrategyCard } from '../strategy-card';
import { StrategyTable } from '../components/strategy-table';
import { StrategyCloneDialog } from '../strategy-clone-dialog';
import { StrategyListToolbar } from '../strategy-list-toolbar';
import { StrategyCreateDialog } from '../strategy-create-dialog';
import { StrategyDeleteDialog } from '../strategy-delete-dialog';
import { StrategySummaryBar } from '../components/strategy-summary-bar';
import { useStrategyListFilters } from '../hooks/use-strategy-list-filters';

// ----------------------------------------------------------------------

const PAGE_SIZE = 12;

export function StrategyListView() {
  const router = useRouter();
  const { filter, setFilter, resetFilter, isFiltered } = useStrategyListFilters();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const listRequestIdRef = useRef(0);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [cloneTarget, setCloneTarget] = useState<Strategy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Strategy | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuStrategyId, setMenuStrategyId] = useState<string | null>(null);

  // Collect all used tags across loaded strategies for the tag filter autocomplete
  const allTags = Array.from(new Set(strategies.flatMap((s) => s.tags)));

  const tagsKey = JSON.stringify(filter.tags);
  const requestFilter = useMemo(() => {
    const tags = JSON.parse(tagsKey) as string[];
    return {
      strategyType: filter.strategyType || undefined,
      tags: tags.length > 0 ? tags : undefined,
      keyword: filter.keyword || undefined,
      minTotalReturn: filter.minTotalReturn ? parseFloat(filter.minTotalReturn) / 100 : undefined,
      minSharpeRatio: filter.minSharpeRatio ? parseFloat(filter.minSharpeRatio) : undefined,
      hasActiveSignal: filter.hasActiveSignal || undefined,
    };
  }, [
    filter.hasActiveSignal,
    filter.keyword,
    filter.minSharpeRatio,
    filter.minTotalReturn,
    filter.strategyType,
    tagsKey,
  ]);
  const requestFilterKey = JSON.stringify(requestFilter);
  const previousRequestFilterKeyRef = useRef(requestFilterKey);

  const beginListTransition = useCallback(() => {
    listRequestIdRef.current += 1;
    setLoading(true);
    setError('');
  }, []);

  const handleFilterChange = useCallback(
    (patch: Parameters<typeof setFilter>[0]) => {
      if (Object.keys(patch).some((key) => key !== 'view')) beginListTransition();
      setFilter(patch);
    },
    [beginListTransition, setFilter]
  );

  const handleResetFilter = useCallback(() => {
    beginListTransition();
    resetFilter();
  }, [beginListTransition, resetFilter]);

  // 筛选和分页由同一个 effect 发请求，避免首次加载及“筛选 + page=1”重复请求。
  useEffect(() => {
    const filterChanged = previousRequestFilterKeyRef.current !== requestFilterKey;
    previousRequestFilterKeyRef.current = requestFilterKey;
    if (filterChanged && page !== 1) {
      setPage(1);
      return undefined;
    }

    const requestId = listRequestIdRef.current + 1;
    listRequestIdRef.current = requestId;
    setLoading(true);
    setError('');

    void listStrategies({ ...requestFilter, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (listRequestIdRef.current !== requestId) return;
        setStrategies(res.strategies);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        if (listRequestIdRef.current !== requestId) return;
        setError(err instanceof Error ? err.message : '获取策略列表失败');
      })
      .finally(() => {
        if (listRequestIdRef.current === requestId) setLoading(false);
      });

    return () => {
      if (listRequestIdRef.current === requestId) listRequestIdRef.current += 1;
    };
  }, [page, refreshVersion, requestFilter, requestFilterKey]);

  const refreshFirstPage = useCallback(() => {
    beginListTransition();
    if (page === 1) setRefreshVersion((version) => version + 1);
    else setPage(1);
  }, [beginListTransition, page]);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleView = (id: string) => {
    router.push(`/strategy/${id}`);
  };

  const handleRun = (strategy: Strategy) => {
    router.push(`/strategy/${strategy.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuStrategyId(id);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuStrategyId(null);
  };

  const handleEdit = (strategy: Strategy) => {
    router.push(`/strategy/${strategy.id}`);
  };

  const handleCreate = async (data: Parameters<typeof createStrategy>[0]) => {
    setSubmitting(true);
    try {
      await createStrategy(data);
      setCreateOpen(false);
      setSuccessMsg('策略创建成功');
      refreshFirstPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClone = async (name: string) => {
    if (!cloneTarget) return;
    setSubmitting(true);
    try {
      const newStrategy = await cloneStrategy({ id: cloneTarget.id, name });
      setCloneTarget(null);
      setSuccessMsg('策略克隆成功');
      router.push(`/strategy/${newStrategy.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '克隆失败');
      setCloneTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await deleteStrategy({ id: deleteTarget.id });
      setDeleteTarget(null);
      setSuccessMsg('策略已删除');
      refreshFirstPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      setDeleteTarget(null);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <DashboardContent>
      {/* Page header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          我的策略
        </Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="eva:plus-fill" />}
          onClick={() => setCreateOpen(true)}
        >
          新建策略
        </Button>
      </Box>

      {/* Summary bar */}
      <StrategySummaryBar />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filter toolbar */}
      <StrategyListToolbar
        filter={filter}
        allTags={allTags}
        isFiltered={isFiltered}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilter}
      />

      {/* Strategy content — card or table */}
      {filter.view === 'table' ? (
        /* Table view */
        loading ? (
          <Skeleton variant="rounded" height={300} sx={{ mt: 1 }} />
        ) : strategies.length === 0 ? (
          <EmptyState isFiltered={isFiltered} onReset={handleResetFilter} />
        ) : (
          <StrategyTable
            strategies={strategies}
            onView={handleView}
            onClone={(s) => setCloneTarget(s)}
            onDelete={(s) => setDeleteTarget(s)}
          />
        )
      ) : /* Card view */
      loading ? (
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : strategies.length === 0 ? (
        <EmptyState isFiltered={isFiltered} onReset={handleResetFilter} />
      ) : (
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          {strategies.map((strategy) => (
            <Grid key={strategy.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <StrategyCard
                strategy={strategy}
                onView={handleView}
                onRun={handleRun}
                onEdit={handleEdit}
                onClone={(s) => setCloneTarget(s)}
                onDelete={(s) => setDeleteTarget(s)}
                menuAnchorEl={menuAnchorEl}
                menuStrategyId={menuStrategyId}
                onMenuOpen={handleMenuOpen}
                onMenuClose={handleMenuClose}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, nextPage) => {
              if (nextPage === page) return;
              beginListTransition();
              setPage(nextPage);
            }}
            color="primary"
          />
        </Box>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <StrategyCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreate}
        submitting={submitting}
      />

      <StrategyCloneDialog
        open={Boolean(cloneTarget)}
        strategy={cloneTarget}
        onClose={() => setCloneTarget(null)}
        onConfirm={handleClone}
        submitting={submitting}
      />

      <StrategyDeleteDialog
        open={Boolean(deleteTarget)}
        strategy={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        submitting={submitting}
      />

      {/* Success snackbar */}
      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg('')}
        message={successMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function EmptyState({ isFiltered, onReset }: { isFiltered: boolean; onReset: () => void }) {
  return (
    <Box sx={{ py: 12, textAlign: 'center', color: 'text.secondary' }}>
      <Iconify icon="solar:document-text-bold" width={48} sx={{ mb: 2, opacity: 0.3 }} />
      <Typography variant="h6" sx={{ mb: 1 }}>
        {isFiltered ? '没有匹配的策略' : '还没有策略，点击右上角创建第一个'}
      </Typography>
      {isFiltered && (
        <Button variant="outlined" size="small" onClick={onReset}>
          清除筛选
        </Button>
      )}
    </Box>
  );
}
