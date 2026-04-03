import type { Strategy } from 'src/api/strategy';

import { useState, useEffect, useCallback } from 'react';

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
import { StrategyCloneDialog } from '../strategy-clone-dialog';
import { StrategyListToolbar } from '../strategy-list-toolbar';
import { StrategyCreateDialog } from '../strategy-create-dialog';
import { StrategyDeleteDialog } from '../strategy-delete-dialog';

import type { StrategyListFilter } from '../strategy-list-toolbar';

// ----------------------------------------------------------------------

const PAGE_SIZE = 12;

export function StrategyListView() {
  const router = useRouter();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [filter, setFilter] = useState<StrategyListFilter>({
    strategyType: '',
    keyword: '',
    tags: [],
  });

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

  const fetchStrategies = useCallback(
    async (overridePage?: number) => {
      setLoading(true);
      setError('');
      try {
        const res = await listStrategies({
          strategyType: filter.strategyType || undefined,
          tags: filter.tags.length > 0 ? filter.tags : undefined,
          keyword: filter.keyword || undefined,
          page: overridePage ?? page,
          pageSize: PAGE_SIZE,
        });
        setStrategies(res.strategies);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取策略列表失败');
      } finally {
        setLoading(false);
      }
    },
    [filter, page]
  );

  // Re-fetch when filter changes (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchStrategies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Re-fetch when page changes (filter already applied)
  useEffect(() => {
    fetchStrategies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
      fetchStrategies(1);
      setPage(1);
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
      fetchStrategies(1);
      setPage(1);
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Filter toolbar */}
      <StrategyListToolbar filter={filter} allTags={allTags} onFilterChange={(f) => setFilter(f)} />

      {/* Strategy card grid */}
      {loading ? (
        <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={200} />
            </Grid>
          ))}
        </Grid>
      ) : strategies.length === 0 ? (
        <Box sx={{ py: 12, textAlign: 'center', color: 'text.secondary' }}>
          <Iconify icon="solar:document-text-bold" width={48} sx={{ mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            {filter.strategyType || filter.keyword || filter.tags.length > 0
              ? '没有匹配的策略'
              : '还没有策略，点击右上角创建第一个'}
          </Typography>
          {(filter.strategyType || filter.keyword || filter.tags.length > 0) && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setFilter({ strategyType: '', keyword: '', tags: [] })}
            >
              清除筛选
            </Button>
          )}
        </Box>
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
            onChange={(_, p) => setPage(p)}
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
