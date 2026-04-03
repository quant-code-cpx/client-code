import type { Watchlist, WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import {
  deleteWatchlist,
  getWatchlistStocks,
  getWatchlistOverview,
} from 'src/api/watchlist';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { WatchlistDetailPanel } from '../watchlist-detail-panel';
import { WatchlistCreateDialog } from '../watchlist-create-dialog';
import { WatchlistEditDialog } from '../watchlist-edit-dialog';
import { WatchlistAddStockDialog } from '../watchlist-add-stock-dialog';
import { WatchlistBatchImportDialog } from '../watchlist-batch-import-dialog';
import { WatchlistOverviewCards } from '../watchlist-overview-cards';

// ----------------------------------------------------------------------

export function WatchlistView() {
  const [watchlists, setWatchlists] = useState<WatchlistOverviewItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [stocks, setStocks] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [stocksLoading, setStocksLoading] = useState(false);
  const [error, setError] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogWatchlist, setEditDialogWatchlist] = useState<Watchlist | null>(null);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [batchImportDialogOpen, setBatchImportDialogOpen] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getWatchlistOverview();
      setWatchlists(data);
      if (data.length > 0 && selectedId === null) {
        const defaultWl = data.find((w) => w.isDefault) ?? data[0];
        setSelectedId(defaultWl.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取自选组失败');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadStocks = useCallback(async (watchlistId: number) => {
    setStocksLoading(true);
    try {
      const data = await getWatchlistStocks(watchlistId);
      setStocks(data.stocks);
    } catch {
      setStocks([]);
    } finally {
      setStocksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId !== null) {
      loadStocks(selectedId);
    } else {
      setStocks([]);
    }
  }, [selectedId, loadStocks]);

  const selectedWatchlist = watchlists.find((w) => w.id === selectedId) ?? null;

  const handleCreateSuccess = (watchlist: Watchlist) => {
    const newItem: WatchlistOverviewItem = { ...watchlist, summary: null };
    setWatchlists((prev) => [...prev, newItem]);
    setSelectedId(watchlist.id);
  };

  const handleEditSuccess = (updated: Watchlist) => {
    setWatchlists((prev) =>
      prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w))
    );
  };

  const handleDelete = async (watchlist: WatchlistOverviewItem) => {
    try {
      await deleteWatchlist(watchlist.id);
      setWatchlists((prev) => prev.filter((w) => w.id !== watchlist.id));
      if (selectedId === watchlist.id) {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleUpdateStock = (updated: WatchlistStock) => {
    setStocks((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleRemoveStock = (stockId: number) => {
    setStocks((prev) => prev.filter((s) => s.id !== stockId));
  };

  const handleBatchRemoveStocks = (stockIds: number[]) => {
    setStocks((prev) => prev.filter((s) => !stockIds.includes(s.id)));
  };

  const handleStockRefresh = () => {
    if (selectedId !== null) {
      loadStocks(selectedId);
    }
  };

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
        >
          新建自选组
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" width={200} height={110} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <WatchlistOverviewCards
            watchlists={watchlists}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={(wl) => setEditDialogWatchlist(wl)}
            onDelete={handleDelete}
            onCreate={() => setCreateDialogOpen(true)}
          />
        </Box>
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
          onEdit={() => setEditDialogWatchlist(selectedWatchlist)}
          onDelete={() => handleDelete(selectedWatchlist)}
          onAddStock={() => setAddStockDialogOpen(true)}
          onBatchImport={() => setBatchImportDialogOpen(true)}
          onUpdateStock={handleUpdateStock}
          onRemoveStock={handleRemoveStock}
          onBatchRemoveStocks={handleBatchRemoveStocks}
        />
      )}

      <WatchlistCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSuccess={handleCreateSuccess}
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
          onSuccess={() => {
            setAddStockDialogOpen(false);
            handleStockRefresh();
          }}
        />
      )}

      {selectedId !== null && (
        <WatchlistBatchImportDialog
          open={batchImportDialogOpen}
          watchlistId={selectedId}
          onClose={() => setBatchImportDialogOpen(false)}
          onSuccess={() => {
            setBatchImportDialogOpen(false);
            handleStockRefresh();
          }}
        />
      )}
    </DashboardContent>
  );
}
