import type { FactorDef, FactorCategory, FactorLibraryResult } from 'src/api/factor';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  factorApi,
  deleteCustomFactor,
  updateCustomFactor,
  precomputeCustomFactor,
  batchPrecomputeFactors,
} from 'src/api/factor';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { FactorCustomDialog } from '../factor-custom-dialog';
import { FactorLibraryCardV2 } from '../library/factor-library-card';
import { FactorLibraryTable } from '../library/factor-library-table';
import { FactorLibraryBulkBar } from '../library/factor-library-bulk-bar';
import { FactorLibraryCategoryTabs } from '../factor-library-category-tabs';
import { FactorLibraryFilterBar } from '../library/factor-library-filter-bar';
import { FactorLibraryDetailDrawer } from '../library/factor-library-detail-drawer';
import { useFactorLibraryFilters } from '../library/hooks/use-factor-library-filters';

// ----------------------------------------------------------------------

export function FactorLibraryView() {
  const router = useRouter();
  const { filters, setFilters, reset } = useFactorLibraryFilters();

  const [library, setLibrary] = useState<FactorLibraryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState(filters.search);

  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editFactor, setEditFactor] = useState<FactorDef | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<FactorDef | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');

  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [precomputingNames, setPrecomputingNames] = useState<Set<string>>(new Set());
  const [batchPrecomputing, setBatchPrecomputing] = useState(false);
  const [detailFactor, setDetailFactor] = useState<FactorDef | null>(null);

  // 搜索防抖（250ms）
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.search) setFilters({ search: searchInput });
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput, filters.search, setFilters]);

  const fetchLibrary = useCallback(() => {
    setLoading(true);
    setError('');
    factorApi
      .library()
      .then((data) => setLibrary(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : '获取因子库失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  /** 全部因子（扁平化） */
  const allFactors = useMemo<FactorDef[]>(
    () => library?.categories.flatMap((c) => c.factors) ?? [],
    [library]
  );

  /** 头部摘要计数 */
  const headerCounts = useMemo(() => {
    if (library?.meta) return library.meta;
    const totalCount = allFactors.length;
    const enabledCount = allFactors.filter((f) => f.isEnabled !== false).length;
    const customCount = allFactors.filter((f) => !f.isBuiltin).length;
    const staleCount = allFactors.filter((f) => {
      if (f.status === 'STALE') return true;
      const latency = f.summary?.latencyDays;
      return latency !== undefined && latency !== null && latency > 5;
    }).length;
    return { totalCount, enabledCount, customCount, staleCount };
  }, [library, allFactors]);

  /** 应用筛选 + 排序 */
  const visibleFactors = useMemo<FactorDef[]>(() => {
    let arr = allFactors;

    if (filters.category !== 'ALL') {
      arr = arr.filter((f) => f.category === (filters.category as FactorCategory));
    }
    if (filters.search) {
      const lower = filters.search.toLowerCase();
      arr = arr.filter(
        (f) => f.name.toLowerCase().includes(lower) || f.label.includes(filters.search)
      );
    }
    if (filters.sourceTypes.length > 0) {
      arr = arr.filter((f) => filters.sourceTypes.includes(f.sourceType));
    }
    if (filters.statuses.length > 0) {
      // HEALTHY is an alias for FRESH; MISSING is an alias for NEVER
      const expandedStatuses = new Set<string>(filters.statuses);
      if (filters.statuses.includes('FRESH')) expandedStatuses.add('HEALTHY');
      if (filters.statuses.includes('NEVER')) expandedStatuses.add('MISSING');
      arr = arr.filter((f) => f.status !== undefined && expandedStatuses.has(f.status));
    }
    if (filters.icMin !== null) {
      arr = arr.filter((f) => (f.summary?.ic10d ?? -Infinity) >= (filters.icMin ?? 0));
    }
    if (filters.coverageMin !== null) {
      arr = arr.filter((f) => (f.summary?.coverage ?? -Infinity) >= (filters.coverageMin ?? 0));
    }

    const sortMul = filters.sortOrder === 'desc' ? -1 : 1;
    const getValue = (f: FactorDef): number | string => {
      switch (filters.sortBy) {
        case 'ir':
          return f.summary?.ir ?? -Infinity;
        case 'ic10d':
          return f.summary?.ic10d ?? -Infinity;
        case 'coverage':
          return f.summary?.coverage ?? -Infinity;
        case 'lastComputeDate':
          return f.summary?.lastComputeDate ?? '';
        case 'name':
          return f.name;
        default:
          return 0;
      }
    };
    return [...arr].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sortMul;
      return String(va).localeCompare(String(vb)) * sortMul;
    });
  }, [allFactors, filters]);

  const selectedFactors = useMemo<FactorDef[]>(
    () => allFactors.filter((f) => selectedNames.has(f.name)),
    [allFactors, selectedNames]
  );

  const toggleSelect = useCallback((factor: FactorDef) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(factor.name)) next.delete(factor.name);
      else next.add(factor.name);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((factors: FactorDef[], on: boolean) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      factors.forEach((f) => {
        if (on) next.add(f.name);
        else next.delete(f.name);
      });
      return next;
    });
  }, []);

  const handleEdit = useCallback((factor: FactorDef) => {
    setEditFactor(factor);
    setCustomDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteCustomFactor({ name: deleteTarget.name ?? deleteTarget.id });
      setSnackMsg(`已删除「${deleteTarget.label}」`);
      setDeleteTarget(null);
      fetchLibrary();
    } catch {
      setSnackMsg('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget, fetchLibrary]);

  const handlePrecompute = useCallback(async (factor: FactorDef) => {
    setPrecomputingNames((prev) => new Set(prev).add(factor.name));
    try {
      await precomputeCustomFactor({ name: factor.name ?? factor.id });
      setSnackMsg(`「${factor.label}」预计算任务已提交`);
    } catch {
      setSnackMsg('触发预计算失败');
    } finally {
      setPrecomputingNames((prev) => {
        const next = new Set(prev);
        next.delete(factor.name);
        return next;
      });
    }
  }, []);

  const handleToggleEnabled = useCallback(
    async (factor: FactorDef, isEnabled: boolean) => {
      // 乐观更新
      setLibrary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((c) => ({
            ...c,
            factors: c.factors.map((f) => (f.name === factor.name ? { ...f, isEnabled } : f)),
          })),
        };
      });
      try {
        await updateCustomFactor({ name: factor.name, isEnabled });
        setSnackMsg(`「${factor.label}」已${isEnabled ? '启用' : '禁用'}`);
      } catch {
        setSnackMsg('切换启用状态失败');
        fetchLibrary();
      }
    },
    [fetchLibrary]
  );

  const handleAddToScreening = useCallback(
    (factors: FactorDef[]) => {
      const names = factors.map((f) => f.name).join(',');
      router.push(`/factor/screening?names=${encodeURIComponent(names)}`);
    },
    [router]
  );

  const handleBatchPrecompute = useCallback(async () => {
    const customNames = selectedFactors.filter((f) => !f.isBuiltin).map((f) => f.name);
    if (customNames.length === 0) return;
    setBatchPrecomputing(true);
    setPrecomputingNames((prev) => {
      const next = new Set(prev);
      customNames.forEach((n) => next.add(n));
      return next;
    });
    try {
      // 优先调用批量端点（BE-3）
      await batchPrecomputeFactors({ factorNames: customNames });
      setSnackMsg(`已提交 ${customNames.length} 个因子的预计算任务`);
    } catch {
      // 退化为串行调用
      let success = 0;
      for (const name of customNames) {
        try {
          await precomputeCustomFactor({ name });
          success += 1;
        } catch {
          // ignore single failure
        }
      }
      setSnackMsg(`批量预计算完成（成功 ${success} / ${customNames.length}）`);
    } finally {
      setBatchPrecomputing(false);
      setPrecomputingNames((prev) => {
        const next = new Set(prev);
        customNames.forEach((n) => next.delete(n));
        return next;
      });
    }
  }, [selectedFactors]);

  const handleCopyNames = useCallback(() => {
    const text = selectedFactors.map((f) => f.name).join(',');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => setSnackMsg(`已复制 ${selectedFactors.length} 个因子名称`),
        () => setSnackMsg('复制失败')
      );
    }
  }, [selectedFactors]);

  const handleCustomDialogClose = useCallback(() => {
    setCustomDialogOpen(false);
    setEditFactor(undefined);
  }, []);

  return (
    <DashboardContent>
      {/* 页头 */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4">因子库</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              共 {headerCounts.totalCount} 个
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · 启用 {headerCounts.enabledCount}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · 自定义 {headerCounts.customCount}
            </Typography>
            {headerCounts.staleCount > 0 && (
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ cursor: 'pointer' }}
                onClick={() => setFilters({ statuses: ['STALE'] })}
              >
                · ⚠ 数据滞后 {headerCounts.staleCount}
              </Typography>
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToggleButtonGroup
            size="small"
            value={filters.view}
            exclusive
            onChange={(_, v) => {
              if (v) setFilters({ view: v });
            }}
          >
            <ToggleButton value="card">
              <Iconify icon="solar:widget-bold" width={16} />
            </ToggleButton>
            <ToggleButton value="table">
              <Iconify icon="solar:layers-bold" width={16} />
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:add-circle-bold" />}
            onClick={() => setCustomDialogOpen(true)}
          >
            自定义因子
          </Button>

          <TextField
            size="small"
            placeholder="搜索因子名称…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            sx={{ width: 240 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && library && (
        <FactorLibraryCategoryTabs
          value={filters.category as FactorCategory | 'ALL'}
          categories={library.categories}
          onChange={(c) => setFilters({ category: c })}
        />
      )}

      <FactorLibraryFilterBar filters={filters} onChange={setFilters} onReset={reset} />

      <FactorLibraryBulkBar
        selected={selectedFactors}
        onClear={() => setSelectedNames(new Set())}
        onAddToScreening={() => handleAddToScreening(selectedFactors)}
        onBatchPrecompute={handleBatchPrecompute}
        onCopyNames={handleCopyNames}
        batchPrecomputing={batchPrecomputing}
      />

      {loading ? (
        <Grid container spacing={2}>
          {[...Array(12)].map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : filters.view === 'table' ? (
        <FactorLibraryTable
          factors={visibleFactors}
          selectedNames={selectedNames}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          onOpenDetail={setDetailFactor}
          onEdit={handleEdit}
          onDelete={setDeleteTarget}
          onPrecompute={handlePrecompute}
          precomputingNames={precomputingNames}
        />
      ) : (
        <Grid container spacing={2}>
          {visibleFactors.map((factor) => (
            <Grid key={factor.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <FactorLibraryCardV2
                factor={factor}
                selected={selectedNames.has(factor.name)}
                onToggleSelect={toggleSelect}
                onOpenDetail={setDetailFactor}
                onEdit={factor.isBuiltin ? undefined : handleEdit}
                onDelete={factor.isBuiltin ? undefined : setDeleteTarget}
                onPrecompute={factor.isBuiltin ? undefined : handlePrecompute}
                onToggleEnabled={factor.isBuiltin ? undefined : handleToggleEnabled}
                precomputing={precomputingNames.has(factor.name)}
              />
            </Grid>
          ))}
          {visibleFactors.length === 0 && (
            <Grid size={{ xs: 12 }}>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  当前筛选下无匹配因子
                </Typography>
                <Button size="small" onClick={reset}>
                  重置筛选
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <FactorCustomDialog
        open={customDialogOpen}
        onClose={handleCustomDialogClose}
        onSuccess={fetchLibrary}
        editFactor={editFactor}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="确认删除"
        content={`确定删除自定义因子「${deleteTarget?.label}」吗？此操作不可恢复。`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        submitting={deleteLoading}
        confirmColor="error"
        confirmLabel="删除"
      />

      <FactorLibraryDetailDrawer
        factor={detailFactor}
        onClose={() => setDetailFactor(null)}
        onAddToScreening={(f) => {
          setDetailFactor(null);
          handleAddToScreening([f]);
        }}
      />

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardContent>
  );
}
