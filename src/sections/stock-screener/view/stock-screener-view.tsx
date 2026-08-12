import type {
  AreaItem,
  IndustryItem,
  ScreenerResult,
  ScreenerPreset,
  ScreenerFilters,
  ScreenerConceptItem,
} from 'src/api/screener';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  fetchAreas,
  fetchScreener,
  fetchIndustries,
  fetchScreenerPresets,
  fetchScreenerConcepts,
} from 'src/api/screener';

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
  const [appliedFilters, setAppliedFilters] = useState<ScreenerFilters>(DEFAULT_FILTERS);
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
  const [concepts, setConcepts] = useState<ScreenerConceptItem[]>([]);
  const [queryVersion, setQueryVersion] = useState(0);
  const requestGenerationRef = useRef(0);

  // 计算动态列
  const visibleColumns = computeVisibleColumns(filters, sortBy);

  // 初始化：辅助数据与主查询各自独立，辅助数据失败不阻塞选股。
  useEffect(() => {
    const init = async () => {
      const [presetsRes, industriesRes, areasRes, conceptsRes] = await Promise.allSettled([
        fetchScreenerPresets(),
        fetchIndustries(),
        fetchAreas(),
        fetchScreenerConcepts(),
      ]);
      if (presetsRes.status === 'fulfilled') setPresets(presetsRes.value.presets ?? []);
      if (industriesRes.status === 'fulfilled')
        setIndustries(industriesRes.value.industries ?? []);
      if (areasRes.status === 'fulfilled') setAreas(areasRes.value.areas ?? []);
      if (conceptsRes.status === 'fulfilled') setConcepts(conceptsRes.value.concepts ?? []);
    };
    init();
  }, []);

  // 所有查询参数收敛到一个 Effect；只允许最新请求提交结果。
  useEffect(() => {
    const requestGeneration = ++requestGenerationRef.current;
    let active = true;

    setLoading(true);
    setError('');

    fetchScreener({
      ...appliedFilters,
      page: page + 1,
      pageSize: rowsPerPage,
      sortBy,
      sortOrder,
    })
      .then((data) => {
        if (active && requestGeneration === requestGenerationRef.current) {
          setResult(data);
        }
      })
      .catch((e) => {
        if (active && requestGeneration === requestGenerationRef.current) {
          setError(e instanceof Error ? e.message : '选股查询失败');
        }
      })
      .finally(() => {
        if (active && requestGeneration === requestGenerationRef.current) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appliedFilters, page, queryVersion, rowsPerPage, sortBy, sortOrder]);

  // 处理用户手动修改筛选条件
  const handleFilterChange = useCallback((newFilters: ScreenerFilters) => {
    setFilters(newFilters);
    setActivePreset('custom');
  }, []);

  // 点击"开始选股"
  const handleSearch = useCallback(() => {
    setPage(0);
    setAppliedFilters({ ...filters });
  }, [filters]);

  // 重置条件
  const handleReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters({ ...DEFAULT_FILTERS });
    setActivePreset(null);
    setPage(0);
    setSortBy('totalMv');
    setSortOrder('desc');
  }, []);

  // 点击预设
  const handlePresetSelect = useCallback(
    (preset: ScreenerPreset) => {
      const newFilters = { ...DEFAULT_FILTERS, ...preset.filters };
      setFilters(newFilters);
      setAppliedFilters(newFilters);
      setActivePreset(preset.id);
      setPage(0);
    },
    []
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
        concepts={concepts}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />

      {/* 错误提示 */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => setQueryVersion((v) => v + 1)}>
              重试
            </Button>
          }
        >
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
