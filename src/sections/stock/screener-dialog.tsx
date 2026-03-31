import type {
  AreaItem,
  IndustryItem,
  StrategyItem,
  ScreenerPreset,
  ScreenerResult,
  ScreenerFilters,
  ScreenerStrategy,
} from 'src/api/screener';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import useMediaQuery from '@mui/material/useMediaQuery';

import {
  fetchAreas,
  fetchScreener,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  fetchIndustries,
  fetchStrategies,
  fetchScreenerPresets,
} from 'src/api/screener';

import { ScreenerFilterPanel } from 'src/sections/stock-screener/screener-filter-panel';
import { ScreenerResultTable } from 'src/sections/stock-screener/screener-result-table';
import { ScreenerResultToolbar } from 'src/sections/stock-screener/screener-result-toolbar';
import {
  DEFAULT_FILTERS,
  SORT_TO_COLUMN_MAP,
  SCREENER_HEAD_CELLS,
  FILTER_TO_COLUMN_MAP,
} from 'src/sections/stock-screener/constants';

import { ScreenerSaveDialog } from './screener-save-dialog';
import { ScreenerStrategyBar } from './screener-strategy-bar';

// ----------------------------------------------------------------------

type ScreenerDialogProps = {
  open: boolean;
  onClose: () => void;
};

// ----------------------------------------------------------------------

function computeVisibleColumns(filters: ScreenerFilters, sortBy: string): string[] {
  const cols = new Set<string>(
    SCREENER_HEAD_CELLS.filter((c) => c.defaultVisible === true).map((c) => c.id)
  );
  for (const [key, ids] of Object.entries(FILTER_TO_COLUMN_MAP)) {
    if (filters[key as keyof ScreenerFilters] != null) {
      ids.forEach((id) => cols.add(id));
    }
  }
  const sortCol = SORT_TO_COLUMN_MAP[sortBy];
  if (sortCol) cols.add(sortCol);
  return Array.from(cols);
}

// ----------------------------------------------------------------------

export function ScreenerDialog({ open, onClose }: ScreenerDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

  // ── 查询参数 ──
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState('totalMv');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ── 查询结果 ──
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── 策略相关 ──
  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [strategies, setStrategies] = useState<ScreenerStrategy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  // 覆盖更新模式：存储待更新的策略 id
  const [updateTargetId, setUpdateTargetId] = useState<number | null>(null);

  // ── 辅助数据 ──
  const [industries, setIndustries] = useState<IndustryItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  const visibleColumns = computeVisibleColumns(filters, sortBy);

  // ── 执行查询 ──
  const doSearch = useCallback(
    async (overridePage?: number) => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchScreener({
          ...filters,
          page: (overridePage ?? page) + 1,
          pageSize: rowsPerPage,
          sortBy,
          sortOrder,
        });
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : '选股查询失败');
      } finally {
        setLoading(false);
      }
    },
    [filters, page, rowsPerPage, sortBy, sortOrder]
  );

  // ── 初始化：Dialog 打开时加载 ──
  useEffect(() => {
    if (!open) return;

    const init = async () => {
      try {
        const [presetsRes, strategiesRes, industriesRes, areasRes] = await Promise.allSettled([
          fetchScreenerPresets(),
          fetchStrategies(),
          fetchIndustries(),
          fetchAreas(),
        ]);
        if (presetsRes.status === 'fulfilled') setPresets(presetsRes.value.presets ?? []);
        if (strategiesRes.status === 'fulfilled')
          setStrategies(strategiesRes.value.strategies ?? []);
        if (industriesRes.status === 'fulfilled')
          setIndustries(industriesRes.value.industries ?? []);
        if (areasRes.status === 'fulfilled') setAreas(areasRes.value.areas ?? []);
      } catch {
        // 辅助数据失败不阻塞主流程
      }

      setLoading(true);
      setError('');
      try {
        const data = await fetchScreener({
          page: 1,
          pageSize: 20,
          sortBy: 'totalMv',
          sortOrder: 'desc',
        });
        setResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : '选股查询失败');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [open]);

  // ── 翻页/每页条数变化 ──
  useEffect(() => {
    if (result !== null && open) {
      doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  // ── 排序变化 ──
  useEffect(() => {
    if (result !== null && open) {
      doSearch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  // ── 选择预设/策略 ──
  const handleSelect = useCallback(
    (item: StrategyItem) => {
      const newFilters = { ...DEFAULT_FILTERS, ...item.filters };
      const newSortBy = item.type === 'user' ? (item.sortBy ?? 'totalMv') : 'totalMv';
      const newSortOrder: 'asc' | 'desc' =
        item.type === 'user' && item.sortOrder === 'asc' ? 'asc' : 'desc';
      setFilters(newFilters);
      setActiveId(item.type === 'builtin' ? item.id : String((item as ScreenerStrategy).id));
      setPage(0);
      setSortBy(newSortBy);
      setSortOrder(newSortOrder);
      setLoading(true);
      setError('');
      fetchScreener({
        ...newFilters,
        page: 1,
        pageSize: rowsPerPage,
        sortBy: newSortBy,
        sortOrder: newSortOrder,
      })
        .then((data) => setResult(data))
        .catch((e) => setError(e instanceof Error ? e.message : '选股查询失败'))
        .finally(() => setLoading(false));
    },
    [rowsPerPage]
  );

  // ── 重置 ──
  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActiveId(null);
    setPage(0);
    setSortBy('totalMv');
    setSortOrder('desc');
    setLoading(true);
    setError('');
    fetchScreener({ page: 1, pageSize: rowsPerPage, sortBy: 'totalMv', sortOrder: 'desc' })
      .then((data) => setResult(data))
      .catch((e) => setError(e instanceof Error ? e.message : '选股查询失败'))
      .finally(() => setLoading(false));
  }, [rowsPerPage]);

  // ── 筛选条件变化 ──
  const handleFilterChange = useCallback((newFilters: ScreenerFilters) => {
    setFilters(newFilters);
    setActiveId('custom');
  }, []);

  // ── 开始选股 ──
  const handleSearch = useCallback(() => {
    setPage(0);
    doSearch(0);
  }, [doSearch]);

  // ── 表格内排序 ──
  const handleSort = useCallback(
    (field: string) => {
      if (field === sortBy) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('desc');
      }
      setPage(0);
    },
    [sortBy]
  );

  // ── 工具栏排序 ──
  const handleSortChange = useCallback((newSortBy: string, newOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newOrder);
    setPage(0);
  }, []);

  // ── 保存策略 ──
  const handleSave = useCallback(
    async (name: string, description?: string) => {
      setSaveLoading(true);
      try {
        const saved = await createStrategy({
          name,
          description,
          filters,
          sortBy,
          sortOrder,
        });
        setStrategies((prev) => [{ ...saved, type: 'user' as const }, ...prev]);
        setActiveId(String(saved.id));
        setSaveDialogOpen(false);
        setUpdateTargetId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : '保存策略失败');
      } finally {
        setSaveLoading(false);
      }
    },
    [filters, sortBy, sortOrder]
  );

  // ── 覆盖更新策略（先弹确认框，用 SaveDialog 复用） ──
  const handleOpenUpdate = useCallback((id: number) => {
    setUpdateTargetId(id);
    setSaveDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(
    async (name: string, description?: string) => {
      if (updateTargetId === null) return;
      setSaveLoading(true);
      try {
        const updated = await updateStrategy(updateTargetId, {
          name,
          description,
          filters,
          sortBy,
          sortOrder,
        });
        setStrategies((prev) =>
          prev.map((s) => (s.id === updateTargetId ? { ...updated, type: 'user' as const } : s))
        );
        setActiveId(String(updated.id));
        setSaveDialogOpen(false);
        setUpdateTargetId(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : '更新策略失败');
      } finally {
        setSaveLoading(false);
      }
    },
    [updateTargetId, filters, sortBy, sortOrder]
  );

  // ── 删除策略 ──
  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteStrategy(id);
      setStrategies((prev) => prev.filter((s) => s.id !== id));
      setActiveId((prev) => (prev === String(id) ? null : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除策略失败');
    }
  }, []);

  const editTarget = strategies.find((s) => s.id === updateTargetId);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        fullScreen={fullScreen}
        scroll="paper"
      >
        <DialogTitle sx={{ pb: 1 }}>选股器</DialogTitle>

        <DialogContent
          dividers
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: { xs: 2, sm: 3 } }}
        >
          {/* 策略栏 */}
          <ScreenerStrategyBar
            presets={presets}
            strategies={strategies}
            activeId={activeId}
            onSelect={handleSelect}
            onReset={handleReset}
            onSave={() => {
              setUpdateTargetId(null);
              setSaveDialogOpen(true);
            }}
            onDelete={handleDelete}
            onUpdate={handleOpenUpdate}
          />

          {/* 筛选条件面板 */}
          <ScreenerFilterPanel
            filters={filters}
            industries={industries}
            areas={areas}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* 结果区域 */}
          <Box
            sx={{
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <ScreenerResultToolbar
              total={result?.total ?? 0}
              loading={loading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
            />
            <ScreenerResultTable
              items={result?.items ?? []}
              total={result?.total ?? 0}
              page={page}
              rowsPerPage={rowsPerPage}
              loading={loading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onPageChange={(newPage) => setPage(newPage)}
              onRowsPerPageChange={(size) => {
                setRowsPerPage(size);
                setPage(0);
              }}
              onSort={handleSort}
              visibleColumns={visibleColumns}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="inherit">
            关闭
          </Button>
        </DialogActions>
      </Dialog>

      {/* 保存/更新策略弹窗 */}
      <ScreenerSaveDialog
        open={saveDialogOpen}
        onClose={() => {
          setSaveDialogOpen(false);
          setUpdateTargetId(null);
        }}
        onSave={updateTargetId !== null ? handleUpdate : handleSave}
        loading={saveLoading}
        defaultName={editTarget?.name ?? ''}
        defaultDescription={editTarget?.description ?? ''}
      />
    </>
  );
}
