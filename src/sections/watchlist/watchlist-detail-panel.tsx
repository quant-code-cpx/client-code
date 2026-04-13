import type { WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

import { removeStock, reorderStocks, batchRemoveStocks } from 'src/api/watchlist';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { WatchlistStockTable } from './watchlist-stock-table';
import { WatchlistStockToolbar } from './watchlist-stock-toolbar';
import { WatchlistEditStockDialog } from './watchlist-edit-stock-dialog';

// ----------------------------------------------------------------------

type WatchlistDetailPanelProps = {
  watchlist: WatchlistOverviewItem;
  stocks: WatchlistStock[];
  stocksLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddStock: () => void;
  onBatchImport: () => void;
  onUpdateStock: (updated: WatchlistStock) => void;
  onRemoveStock: (stockId: number) => void;
  onBatchRemoveStocks: (stockIds: number[]) => void;
  onReorderStocks: (reordered: WatchlistStock[]) => void;
};

export function WatchlistDetailPanel({
  watchlist,
  stocks,
  stocksLoading,
  onAddStock,
  onBatchImport,
  onUpdateStock,
  onRemoveStock,
  onBatchRemoveStocks,
  onReorderStocks,
}: WatchlistDetailPanelProps) {
  const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [editStockDialogStock, setEditStockDialogStock] = useState<WatchlistStock | null>(null);
  const [operationError, setOperationError] = useState('');

  const filteredStocks = useMemo(() => {
    if (!search.trim()) return stocks;
    const lower = search.toLowerCase();
    return stocks.filter((s) => s.tsCode.toLowerCase().includes(lower));
  }, [stocks, search]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedStockIds(checked ? filteredStocks.map((s) => s.id) : []);
  };

  const handleSelect = (id: number) => {
    setSelectedStockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRemoveStock = async (stockId: number) => {
    setOperationError('');
    try {
      await removeStock(watchlist.id, stockId);
      setSelectedStockIds((prev) => prev.filter((x) => x !== stockId));
      onRemoveStock(stockId);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : '删除失败，请重试');
    }
  };

  const handleBatchRemove = async () => {
    if (selectedStockIds.length === 0) return;
    setOperationError('');
    try {
      await batchRemoveStocks(watchlist.id, selectedStockIds);
      onBatchRemoveStocks(selectedStockIds);
      setSelectedStockIds([]);
    } catch (err) {
      setOperationError(err instanceof Error ? err.message : '批量删除失败，请重试');
    }
  };

  const handleReorder = async (reordered: WatchlistStock[]) => {
    const previous = [...stocks];
    onReorderStocks(reordered); // 乐观更新
    const items = reordered.map((s, index) => ({ id: s.id, sortOrder: index }));
    try {
      await reorderStocks(watchlist.id, items);
    } catch (err) {
      console.error('排序保存失败', err);
      onReorderStocks(previous); // 回滚
    }
  };

  return (
    <Card>
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {watchlist.name}
        </Typography>
        {watchlist.isDefault && (
          <Label color="warning" variant="soft">
            <Iconify icon="solar:star-bold" width={14} sx={{ mr: 0.5 }} />
            默认
          </Label>
        )}
        {watchlist.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {watchlist.description}
          </Typography>
        )}
      </Box>

      <Divider />

      {operationError && (
        <Alert severity="error" onClose={() => setOperationError('')} sx={{ mx: 2, mt: 1 }}>
          {operationError}
        </Alert>
      )}

      <WatchlistStockToolbar
        selectedCount={selectedStockIds.length}
        onAdd={onAddStock}
        onBatchImport={onBatchImport}
        onBatchRemove={handleBatchRemove}
        search={search}
        onSearchChange={setSearch}
      />

      <Divider />

      <WatchlistStockTable
        stocks={filteredStocks}
        loading={stocksLoading}
        selectedIds={selectedStockIds}
        onSelectAll={handleSelectAll}
        onSelect={handleSelect}
        onEdit={(row) => setEditStockDialogStock(row)}
        onRemove={handleRemoveStock}
        onReorder={handleReorder}
      />

      <WatchlistEditStockDialog
        open={editStockDialogStock !== null}
        stock={editStockDialogStock}
        watchlistId={watchlist.id}
        onClose={() => setEditStockDialogStock(null)}
        onSuccess={(updated) => {
          setEditStockDialogStock(null);
          onUpdateStock(updated);
        }}
      />
    </Card>
  );
}
