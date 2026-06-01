import type { WatchlistStock, WatchlistOverviewItem } from 'src/api/watchlist';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { removeStock, reorderStocks, batchRemoveStocks } from 'src/api/watchlist';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { computeTargetDistance } from './utils';
import { WatchlistStockTable } from './watchlist-stock-table';
import { WatchlistStockToolbar } from './watchlist-stock-toolbar';
import { WatchlistEditStockDialog } from './watchlist-edit-stock-dialog';

// ----------------------------------------------------------------------

type StatusFilter = 'all' | 'hit' | 'missing' | 'normal';

type WatchlistDetailPanelProps = {
  watchlist: WatchlistOverviewItem;
  stocks: WatchlistStock[];
  stocksLoading: boolean;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  onAddStock: () => void;
  onUpdateStock: (updated: WatchlistStock) => void;
  onRemoveStock: (stockId: number) => void;
  onBatchRemoveStocks: (stockIds: number[]) => void;
  onReorderStocks: (reordered: WatchlistStock[]) => void;
  onNotify: (severity: 'success' | 'error' | 'info', message: string) => void;
};

export function WatchlistDetailPanel({
  watchlist,
  stocks,
  stocksLoading,
  statusFilter,
  onStatusFilterChange,
  onAddStock,
  onUpdateStock,
  onRemoveStock,
  onBatchRemoveStocks,
  onReorderStocks,
  onNotify,
}: WatchlistDetailPanelProps) {
  const [selectedStockIds, setSelectedStockIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [editStockDialogStock, setEditStockDialogStock] = useState<WatchlistStock | null>(null);

  // 删除确认状态
  const [removeTarget, setRemoveTarget] = useState<WatchlistStock | null>(null);
  const [batchRemoveOpen, setBatchRemoveOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  // 切组时清空选择 + 搜索
  useEffect(() => {
    setSelectedStockIds([]);
    setSearch('');
  }, [watchlist.id]);

  const filteredStocks = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return stocks.filter((s) => {
      if (lower) {
        const inCode = s.tsCode.toLowerCase().includes(lower);
        const inName = (s.stockName ?? '').toLowerCase().includes(lower);
        const inIndustry = (s.industry ?? '').toLowerCase().includes(lower);
        const inArea = (s.area ?? '').toLowerCase().includes(lower);
        const inNotes = (s.notes ?? '').toLowerCase().includes(lower);
        const inTags = (s.tags ?? []).some((t) => t.toLowerCase().includes(lower));
        if (!inCode && !inName && !inIndustry && !inArea && !inNotes && !inTags) return false;
      }
      if (statusFilter !== 'all') {
        const distance = computeTargetDistance(s);
        const missing = !s.quote || s.quote.close == null;
        if (statusFilter === 'hit' && !distance?.hit) return false;
        if (statusFilter === 'missing' && !missing) return false;
        if (statusFilter === 'normal' && (distance?.hit || missing)) return false;
      }
      return true;
    });
  }, [stocks, search, statusFilter]);

  const isFiltering = search.trim().length > 0 || statusFilter !== 'all';

  // 选中集合需要根据当前 stocks 同步剔除已删除项（不依赖过滤）
  useEffect(() => {
    setSelectedStockIds((prev) => {
      const validIds = new Set(stocks.map((s) => s.id));
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [stocks]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedStockIds(checked ? filteredStocks.map((s) => s.id) : []);
  };

  const handleSelect = (id: number) => {
    setSelectedStockIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleRequestRemove = (row: WatchlistStock) => {
    setRemoveTarget(row);
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await removeStock(watchlist.id, removeTarget.id);
      setSelectedStockIds((prev) => prev.filter((x) => x !== removeTarget.id));
      onRemoveStock(removeTarget.id);
      onNotify('success', `已从「${watchlist.name}」移除 ${removeTarget.tsCode}`);
      setRemoveTarget(null);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : '移除失败，请重试');
    } finally {
      setRemoving(false);
    }
  };

  const handleRequestBatchRemove = () => {
    if (selectedStockIds.length === 0) return;
    setBatchRemoveOpen(true);
  };

  const handleConfirmBatchRemove = async () => {
    if (selectedStockIds.length === 0) return;
    setRemoving(true);
    try {
      await batchRemoveStocks(watchlist.id, selectedStockIds);
      const removedCount = selectedStockIds.length;
      onBatchRemoveStocks(selectedStockIds);
      setSelectedStockIds([]);
      onNotify('success', `已批量移除 ${removedCount} 只股票`);
      setBatchRemoveOpen(false);
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : '批量移除失败，请重试');
    } finally {
      setRemoving(false);
    }
  };

  const handleReorder = async (reordered: WatchlistStock[]) => {
    if (isFiltering) {
      onNotify('info', '清除筛选后才能调整全局顺序');
      return;
    }
    const previous = [...stocks];
    onReorderStocks(reordered); // 乐观更新
    const items = reordered.map((s, index) => ({ id: s.id, sortOrder: index }));
    try {
      await reorderStocks(watchlist.id, items);
      onNotify('success', '排序已保存');
    } catch (err) {
      onReorderStocks(previous); // 回滚
      onNotify('error', err instanceof Error ? err.message : '排序保存失败，已回滚');
    }
  };

  const batchPreview = selectedStockIds
    .map((id) => stocks.find((s) => s.id === id)?.tsCode)
    .filter(Boolean)
    .slice(0, 5)
    .join('、');

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

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ px: 3, pt: 2, alignItems: 'center', flexWrap: 'wrap' }}
      >
        <TextField
          select
          size="small"
          label="状态筛选"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">全部</MenuItem>
          <MenuItem value="hit">已触达目标</MenuItem>
          <MenuItem value="missing">行情缺失</MenuItem>
          <MenuItem value="normal">正常</MenuItem>
        </TextField>
        {isFiltering && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            已筛选 {filteredStocks.length} / {stocks.length}，拖拽排序已禁用
          </Typography>
        )}
      </Stack>

      <WatchlistStockToolbar
        selectedCount={selectedStockIds.length}
        onAdd={onAddStock}
        onBatchRemove={handleRequestBatchRemove}
        search={search}
        onSearchChange={setSearch}
      />

      <Divider />

      <WatchlistStockTable
        stocks={filteredStocks}
        loading={stocksLoading}
        selectedIds={selectedStockIds}
        dragDisabled={isFiltering}
        emptyText={isFiltering ? '当前筛选条件下没有股票' : '暂无自选股，点击「添加股票」开始添加'}
        onSelectAll={handleSelectAll}
        onSelect={handleSelect}
        onEdit={(row) => setEditStockDialogStock(row)}
        onRemove={handleRequestRemove}
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
          onNotify('success', '股票已更新');
        }}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        title="移除股票"
        content={
          removeTarget
            ? `确认从「${watchlist.name}」移除 ${removeTarget.tsCode}？此操作不影响股票基础数据。`
            : ''
        }
        onClose={() => (removing ? undefined : setRemoveTarget(null))}
        onConfirm={handleConfirmRemove}
        submitting={removing}
        confirmColor="error"
        confirmLabel="移除"
      />

      <ConfirmDialog
        open={batchRemoveOpen}
        title="批量移除"
        content={
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              确认从「{watchlist.name}」批量移除已选 {selectedStockIds.length} 只股票？
            </Typography>
            {batchPreview && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                包含：{batchPreview}
                {selectedStockIds.length > 5 ? ' 等' : ''}
              </Typography>
            )}
          </Box>
        }
        onClose={() => (removing ? undefined : setBatchRemoveOpen(false))}
        onConfirm={handleConfirmBatchRemove}
        submitting={removing}
        confirmColor="error"
        confirmLabel={`移除 ${selectedStockIds.length} 只`}
      />
    </Card>
  );
}

export type { StatusFilter };
