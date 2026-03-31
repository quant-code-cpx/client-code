import type { AreaItem, IndustryItem, ScreenerResult, ScreenerPreset, ScreenerFilters } from 'src/api/screener';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import { fetchAreas, fetchScreener, fetchIndustries, fetchScreenerPresets } from 'src/api/screener';

import { ScreenerPresetBar } from '../screener-preset-bar';
import { ScreenerFilterPanel } from '../screener-filter-panel';
import { ScreenerResultTable } from '../screener-result-table';
import { ScreenerResultToolbar } from '../screener-result-toolbar';
import {
  DEFAULT_FILTERS,
  SORT_TO_COLUMN_MAP,
  SCREENER_HEAD_CELLS,
  FILTER_TO_COLUMN_MAP,
} from '../constants';

// ----------------------------------------------------------------------

/** 根据当前筛选条件和排序字段计算需要显示的列 id 集合 */
function computeVisibleColumns(filters: ScreenerFilters, sortBy: string): string[] {
  const cols = new Set<string>(
    SCREENER_HEAD_CELLS.filter((c) => c.defaultVisible === true).map((c) => c.id)
  );

  // 条件触发
  for (const [key, ids] of Object.entries(FILTER_TO_COLUMN_MAP)) {
    if (filters[key as keyof ScreenerFilters] != null) {
      ids.forEach((id) => cols.add(id));
    }
  }

  // 排序触发
  const sortCol = SORT_TO_COLUMN_MAP[sortBy];
  if (sortCol) cols.add(sortCol);

  return Array.from(cols);
}

// ----------------------------------------------------------------------

export function StockScreenerView() {
  const [filters, setFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState('totalMv');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [industries, setIndustries] = useState<IndustryItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);

  // 计算动态列
  const visibleColumns = computeVisibleColumns(filters, sortBy);

  // 执行查询
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

  // 初始化：并行加载辅助数据，然后执行默认查询
  useEffect(() => {
    const init = async () => {
      try {
        const [presetsRes, industriesRes, areasRes] = await Promise.allSettled([
          fetchScreenerPresets(),
          fetchIndustries(),
          fetchAreas(),
        ]);
        if (presetsRes.status === 'fulfilled') setPresets(presetsRes.value.presets ?? []);
        if (industriesRes.status === 'fulfilled') setIndustries(industriesRes.value.industries ?? []);
        if (areasRes.status === 'fulfilled') setAreas(areasRes.value.areas ?? []);
      } catch {
        // 辅助数据失败不阻塞主流程
      }
      // 执行默认查询
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
     
  }, []);

  // 翻页 / 每页条数变化自动查询
  useEffect(() => {
    if (result !== null) {
      doSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  // 排序变化自动查询
  useEffect(() => {
    if (result !== null) {
      doSearch(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder]);

  // 处理用户手动修改筛选条件
  const handleFilterChange = useCallback((newFilters: ScreenerFilters) => {
    setFilters(newFilters);
    setActivePreset('custom');
  }, []);

  // 点击"开始选股"
  const handleSearch = useCallback(() => {
    setPage(0);
    doSearch(0);
  }, [doSearch]);

  // 重置条件
  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setActivePreset(null);
    setPage(0);
    setSortBy('totalMv');
    setSortOrder('desc');
    // 立即发起默认查询
    setLoading(true);
    setError('');
    fetchScreener({ page: 1, pageSize: rowsPerPage, sortBy: 'totalMv', sortOrder: 'desc' })
      .then((data) => setResult(data))
      .catch((e) => setError(e instanceof Error ? e.message : '选股查询失败'))
      .finally(() => setLoading(false));
  }, [rowsPerPage]);

  // 点击预设
  const handlePresetSelect = useCallback(
    (preset: ScreenerPreset) => {
      const newFilters = { ...DEFAULT_FILTERS, ...preset.filters };
      setFilters(newFilters);
      setActivePreset(preset.id);
      setPage(0);
      setLoading(true);
      setError('');
      fetchScreener({
        ...newFilters,
        page: 1,
        pageSize: rowsPerPage,
        sortBy,
        sortOrder,
      })
        .then((data) => setResult(data))
        .catch((e) => setError(e instanceof Error ? e.message : '选股查询失败'))
        .finally(() => setLoading(false));
    },
    [rowsPerPage, sortBy, sortOrder]
  );

  // 表头排序
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

  // 工具栏排序
  const handleSortChange = useCallback((newSortBy: string, newOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newOrder);
    setPage(0);
  }, []);

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        选股器
      </Typography>

      {/* 预设策略快捷按钮栏 */}
      {presets.length > 0 && (
        <ScreenerPresetBar
          presets={presets}
          activePreset={activePreset}
          onSelect={handlePresetSelect}
          onReset={handleReset}
        />
      )}

      {/* 筛选条件面板 */}
      <ScreenerFilterPanel
        filters={filters}
        industries={industries}
        areas={areas}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* 错误提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* 结果区域 */}
      <Card>
        <ScreenerResultToolbar
          total={result?.total ?? 0}
          loading={loading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />

        <Box>
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
      </Card>
    </DashboardContent>
  );
}
