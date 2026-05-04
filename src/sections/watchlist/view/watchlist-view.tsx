import type { AlertColor } from '@mui/material/Alert';
import type {
  Watchlist,
  WatchlistStock,
  WatchlistSummary,
  WatchlistOverviewItem,
  WatchlistOverviewResponse,
} from 'src/api/watchlist';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useAuth } from 'src/auth';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  deleteWatchlist,
  getWatchlistStocks,
  getWatchlistSummary,
  getWatchlistOverview,
} from 'src/api/watchlist';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { WatchlistHealthBar } from '../watchlist-health-bar';
import { WatchlistEditDialog } from '../watchlist-edit-dialog';
import { WatchlistDetailPanel } from '../watchlist-detail-panel';
import { WatchlistCreateDialog } from '../watchlist-create-dialog';
import { WatchlistOverviewCards } from '../watchlist-overview-cards';
import { WatchlistAddStockDialog } from '../watchlist-add-stock-dialog';

import type { StatusFilter } from '../watchlist-detail-panel';

// ----------------------------------------------------------------------

type FeedbackState = {
  open: boolean;
  severity: AlertColor;
  message: string;
};

const INITIAL_FEEDBACK: FeedbackState = { open: false, severity: 'info', message: '' };

/**
 * 兼容后端两种 overview 响应：
 *   1. `{ watchlists: WatchlistOverviewItem[] }`（推荐契约）
 *   2. `WatchlistOverviewItem[]`（旧版直接数组）
 */
function normalizeOverview(
  raw: WatchlistOverviewResponse | WatchlistOverviewItem[] | null | undefined
): WatchlistOverviewItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.watchlists)) return raw.watchlists;
  return [];
}

export function WatchlistView() {
  const { userProfile } = useAuth();
  const watchlistLimit = userProfile?.watchlistLimit ?? null;

  const [watchlists, setWatchlists] = useState<WatchlistOverviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogWatchlist, setEditDialogWatchlist] = useState<Watchlist | null>(null);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WatchlistOverviewItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackState>(INITIAL_FEEDBACK);

  const notify = useCallback((severity: AlertColor, message: string) => {
    setFeedback({ open: true, severity, message });
  }, []);

  const closeFeedback = useCallback(() => {
    setFeedback((prev) => ({ ...prev, open: false }));
  }, []);

  const enrichSummariesIfNeeded = useCallback(async (items: WatchlistOverviewItem[]) => {
    const missing = items.filter((w) => !w.summary);
    if (missing.length === 0) return;
    setSummaryLoading(true);
    try {
      const results = await Promise.allSettled(
        missing.map((w) => getWatchlistSummary(w.id).then((summary) => ({ id: w.id, summary })))
      );
      const map = new Map<number, WatchlistSummary>();
      results.forEach((r) => {
        if (r.status === 'fulfilled') map.set(r.value.id, r.value.summary);
      });
      if (map.size > 0) {
        setWatchlists((prev) =>
          prev.map((w) => (map.has(w.id) ? { ...w, summary: map.get(w.id)! } : w))
        );
      }
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await getWatchlistOverview();
      const data = normalizeOverview(raw);
      setWatchlists(data);
      setSelectedId((prev) => {
        if (prev !== null && data.some((w) => w.id === prev)) return prev;
        if (data.length === 0) return null;
        const defaultWl = data.find((w) => w.isDefault) ?? data[0];
        return defaultWl.id;
      });
      // 若 overview 未返回 summary，前端并发 summary 接口降级填充
      void enrichSummariesIfNeeded(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取自选组失败');
    } finally {
      setLoading(false);
    }
  }, [enrichSummariesIfNeeded]);

  const loadStocks = useCallback(
    async (watchlistId: number) => {
      setStocksLoading(true);
      try {
        const data = await getWatchlistStocks(watchlistId);
        setStocks(data.stocks);
      } catch (err) {
        setStocks([]);
        notify('error', err instanceof Error ? err.message : '加载股票失败');
      } finally {
        setStocksLoading(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      void loadStocks(selectedId);
    } else {
      setStocks([]);
    }
    // 切组重置 status filter
    setStatusFilter('all');
  }, [selectedId, loadStocks]);

  const selectedWatchlist = watchlists.find((w) => w.id === selectedId) ?? null;

  const handleCreateSuccess = (watchlist: Watchlist) => {
    const newItem: WatchlistOverviewItem = { ...watchlist, summary: null };
    setWatchlists((prev) => [...prev, newItem]);
    setSelectedId(watchlist.id);
    notify('success', `已创建自选组「${watchlist.name}」`);
  };

  const handleEditSuccess = (updated: Watchlist) => {
    setWatchlists((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
    notify('success', '自选组已更新');
  };

  const handleRequestDelete = (watchlist: WatchlistOverviewItem) => {
    setDeleteTarget(watchlist);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteWatchlist(deleteTarget.id);
      const removedId = deleteTarget.id;
      setWatchlists((prev) => prev.filter((w) => w.id !== removedId));
      if (selectedId === removedId) {
        setSelectedId(null);
      }
      notify('success', `已删除自选组「${deleteTarget.name}」`);
      setDeleteTarget(null);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleUpdateStock = (updated: WatchlistStock) => {
    setStocks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleRemoveStock = (stockId: number) => {
    setStocks((prev) => prev.filter((s) => s.id !== stockId));
    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === selectedId ? { ...w, _count: { stocks: Math.max(0, w._count.stocks - 1) } } : w
      )
    );
  };

  const handleBatchRemoveStocks = (stockIds: number[]) => {
    setStocks((prev) => prev.filter((s) => !stockIds.includes(s.id)));
    setWatchlists((prev) =>
      prev.map((w) =>
        w.id === selectedId
          ? { ...w, _count: { stocks: Math.max(0, w._count.stocks - stockIds.length) } }
          : w
      )
    );
  };

  const handleReorderStocks = (reordered: WatchlistStock[]) => {
    setStocks(reordered);
  };

  const handleAddStockSuccess = () => {
    setAddStockDialogOpen(false);
    if (selectedId !== null) {
      void loadStocks(selectedId);
      // 同步刷新当前组 summary
      void getWatchlistSummary(selectedId)
        .then((summary) => {
          setWatchlists((prev) => prev.map((w) => (w.id === selectedId ? { ...w, summary } : w)));
        })
        .catch(() => undefined);
    }
    notify('success', '股票已加入自选组');
  };

  const limitReached =
    watchlistLimit !== null && watchlistLimit > 0 && watchlists.length >= watchlistLimit;

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          自选股管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
          onClick={() => setCreateDialogOpen(true)}
          disabled={limitReached}
        >
          {limitReached ? '已达自选组上限' : '新建自选组'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {!loading && watchlists.length > 0 && (
        <WatchlistHealthBar
          watchlists={watchlists}
          selectedWatchlist={selectedWatchlist}
          stocks={stocks}
          groupLimit={watchlistLimit}
          onClickTargetHit={() => setStatusFilter('hit')}
          onClickQuoteMissing={() => setStatusFilter('missing')}
        />
      )}

      {loading ? (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rectangular"
              width={200}
              height={110}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      ) : (
        watchlists.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <WatchlistOverviewCards
              watchlists={watchlists}
              selectedId={selectedId}
              summaryLoading={summaryLoading}
              onSelect={setSelectedId}
              onEdit={(wl) => setEditDialogWatchlist(wl)}
              onDelete={handleRequestDelete}
              onCreate={() => setCreateDialogOpen(true)}
            />
          </Box>
        )
      )}

      {!loading && watchlists.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Iconify icon="solar:star-bold" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
            还没有自选组
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mb: 3 }}>
            创建自选组，开始管理你关注的股票
          </Typography>
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
            onClick={() => setCreateDialogOpen(true)}
          >
            新建自选组
          </Button>
        </Box>
      )}

      {selectedWatchlist && (
        <WatchlistDetailPanel
          watchlist={selectedWatchlist}
          stocks={stocks}
          stocksLoading={stocksLoading}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onAddStock={() => setAddStockDialogOpen(true)}
          onUpdateStock={handleUpdateStock}
          onRemoveStock={handleRemoveStock}
          onBatchRemoveStocks={handleBatchRemoveStocks}
          onReorderStocks={handleReorderStocks}
          onNotify={notify}
        />
      )}

      <WatchlistCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={(wl) => {
          setCreateDialogOpen(false);
          handleCreateSuccess(wl);
        }}
      />

      <WatchlistEditDialog
        open={editDialogWatchlist !== null}
        watchlist={editDialogWatchlist}
        onClose={() => setEditDialogWatchlist(null)}
        onSuccess={(updated) => {
          setEditDialogWatchlist(null);
          handleEditSuccess(updated);
        }}
      />

      {selectedId !== null && (
        <WatchlistAddStockDialog
          open={addStockDialogOpen}
          watchlistId={selectedId}
          onClose={() => setAddStockDialogOpen(false)}
          onSuccess={handleAddStockSuccess}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除自选组"
        content={
          deleteTarget
            ? `确认删除自选组「${deleteTarget.name}」？该组内 ${deleteTarget._count.stocks} 只股票将一并移除，不影响股票基础数据。`
            : ''
        }
        onClose={() => (deleteSubmitting ? undefined : setDeleteTarget(null))}
        onConfirm={handleConfirmDelete}
        submitting={deleteSubmitting}
        confirmColor="error"
        confirmLabel="删除"
      />

      <Snackbar
        open={feedback.open}
        autoHideDuration={3000}
        onClose={closeFeedback}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={closeFeedback}
          severity={feedback.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
