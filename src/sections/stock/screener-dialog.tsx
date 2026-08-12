import type { ExecutedScreenerQuery } from 'src/sections/stock-screener/screener-query';
import type {
  AreaItem,
  IndustryItem,
  StrategyItem,
  ScreenerPreset,
  ScreenerResult,
  ScreenerFilters,
  ScreenerStrategy,
  ScreenerConceptItem,
} from 'src/api/screener';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
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
  fetchScreenerConcepts,
} from 'src/api/screener';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { ScreenerFilterPanel } from 'src/sections/stock-screener/screener-filter-panel';
import { ScreenerEvidenceList } from 'src/sections/stock-screener/screener-evidence-list';
import { ScreenerResultToolbar } from 'src/sections/stock-screener/screener-result-toolbar';
import { filtersEqual, buildFilterSummaries } from 'src/sections/stock-screener/screener-evidence';
import {
  buildScreenerRequest,
  DEFAULT_EXECUTED_QUERY,
  resolveStrategySelection,
  preserveHistoricalCompatibilityKeys,
} from 'src/sections/stock-screener/screener-query';

import { ScreenerSaveDialog } from './screener-save-dialog';
import { ScreenerStrategyBar } from './screener-strategy-bar';

// ----------------------------------------------------------------------

type ScreenerDialogProps = {
  open: boolean;
  onClose: () => void;
};

// ----------------------------------------------------------------------

export function ScreenerDialog({ open, onClose }: ScreenerDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const requestIdRef = useRef(0);
  const executedQueryRef = useRef<ExecutedScreenerQuery>(DEFAULT_EXECUTED_QUERY);

  const [draftFilters, setDraftFilters] = useState<ScreenerFilters>(DEFAULT_EXECUTED_QUERY.filters);
  const [executedQuery, setExecutedQuery] =
    useState<ExecutedScreenerQuery>(DEFAULT_EXECUTED_QUERY);
  const [result, setResult] = useState<ScreenerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [presets, setPresets] = useState<ScreenerPreset[]>([]);
  const [strategies, setStrategies] = useState<ScreenerStrategy[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [updateTargetId, setUpdateTargetId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScreenerStrategy | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [industries, setIndustries] = useState<IndustryItem[]>([]);
  const [areas, setAreas] = useState<AreaItem[]>([]);
  const [concepts, setConcepts] = useState<ScreenerConceptItem[]>([]);

  const conceptNames = useMemo(
    () => Object.fromEntries(concepts.map((concept) => [concept.tsCode, concept.name])),
    [concepts]
  );
  const dirty = !filtersEqual(draftFilters, executedQuery.filters);
  const executedSummary = useMemo(
    () => buildFilterSummaries(executedQuery.filters, conceptNames),
    [executedQuery.filters, conceptNames]
  );

  const runQuery = useCallback(async (nextQuery: ExecutedScreenerQuery) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const data = await fetchScreener(buildScreenerRequest(nextQuery));
      if (requestIdRef.current !== requestId) return false;
      executedQueryRef.current = nextQuery;
      setExecutedQuery(nextQuery);
      setResult(data);
      return true;
    } catch (caughtError) {
      if (requestIdRef.current === requestId) {
        setError(caughtError instanceof Error ? caughtError.message : '选股查询失败');
      }
      return false;
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      requestIdRef.current += 1;
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    Promise.allSettled([
      fetchScreenerPresets(),
      fetchStrategies(),
      fetchIndustries(),
      fetchAreas(),
      fetchScreenerConcepts(),
    ]).then(([presetsRes, strategiesRes, industriesRes, areasRes, conceptsRes]) => {
      if (cancelled) return;
      if (presetsRes.status === 'fulfilled') setPresets(presetsRes.value.presets ?? []);
      if (strategiesRes.status === 'fulfilled') setStrategies(strategiesRes.value.strategies ?? []);
      if (industriesRes.status === 'fulfilled') setIndustries(industriesRes.value.industries ?? []);
      if (areasRes.status === 'fulfilled') setAreas(areasRes.value.areas ?? []);
      if (conceptsRes.status === 'fulfilled') setConcepts(conceptsRes.value.concepts ?? []);
    });
    void runQuery(executedQueryRef.current);

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
    };
  }, [open, runQuery]);

  const handleClose = useCallback(() => {
    requestIdRef.current += 1;
    setLoading(false);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (item: StrategyItem) => {
      if (loading) return;
      const selection = resolveStrategySelection(item);
      const nextQuery: ExecutedScreenerQuery = {
        filters: selection.filters,
        page: 0,
        rowsPerPage: executedQueryRef.current.rowsPerPage,
        sortBy: selection.sortBy,
        sortOrder: selection.sortOrder,
      };
      setDraftFilters(selection.filters);
      setActiveId(item.type === 'builtin' ? item.id : String(item.id));
      void runQuery(nextQuery);
    },
    [loading, runQuery]
  );

  const handleReset = useCallback(() => {
    if (loading) return;
    const nextQuery = {
      ...DEFAULT_EXECUTED_QUERY,
      rowsPerPage: executedQueryRef.current.rowsPerPage,
    };
    setDraftFilters(nextQuery.filters);
    setActiveId('custom');
    void runQuery(nextQuery);
  }, [loading, runQuery]);

  const handleFilterChange = useCallback((newFilters: ScreenerFilters) => {
    setDraftFilters(newFilters);
    setActiveId('custom');
  }, []);

  const handleSearch = useCallback(() => {
    if (loading) return;
    void runQuery({
      ...executedQueryRef.current,
      filters: { ...draftFilters },
      page: 0,
    });
  }, [draftFilters, loading, runQuery]);

  const handleSortChange = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      if (loading) return;
      void runQuery({
        ...executedQueryRef.current,
        page: 0,
        sortBy,
        sortOrder,
      });
    },
    [loading, runQuery]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (loading) return;
      void runQuery({ ...executedQueryRef.current, page });
    },
    [loading, runQuery]
  );

  const handleRowsPerPageChange = useCallback(
    (rowsPerPage: number) => {
      if (loading) return;
      void runQuery({ ...executedQueryRef.current, page: 0, rowsPerPage });
    },
    [loading, runQuery]
  );

  const handleSave = useCallback(
    async (name: string, description?: string) => {
      setSaveLoading(true);
      try {
        const saved = await createStrategy({
          name,
          description,
          filters: draftFilters,
          sortBy: executedQuery.sortBy,
          sortOrder: executedQuery.sortOrder,
        });
        setStrategies((previous) => [{ ...saved, type: 'user' as const }, ...previous]);
        setActiveId(String(saved.id));
        setSaveDialogOpen(false);
        setUpdateTargetId(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : '保存策略失败');
      } finally {
        setSaveLoading(false);
      }
    },
    [draftFilters, executedQuery.sortBy, executedQuery.sortOrder]
  );

  const handleOpenUpdate = useCallback((id: number) => {
    setUpdateTargetId(id);
    setSaveDialogOpen(true);
  }, []);

  const handleUpdate = useCallback(
    async (name: string, description?: string) => {
      if (updateTargetId === null) return;
      const target = strategies.find((strategy) => strategy.id === updateTargetId);
      const filters = target
        ? preserveHistoricalCompatibilityKeys(target.filters, draftFilters)
        : draftFilters;
      setSaveLoading(true);
      try {
        const updated = await updateStrategy(updateTargetId, {
          name,
          description,
          filters,
          sortBy: executedQuery.sortBy,
          sortOrder: executedQuery.sortOrder,
        });
        setStrategies((previous) =>
          previous.map((strategy) =>
            strategy.id === updateTargetId ? { ...updated, type: 'user' as const } : strategy
          )
        );
        setActiveId(String(updated.id));
        setSaveDialogOpen(false);
        setUpdateTargetId(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : '更新策略失败');
      } finally {
        setSaveLoading(false);
      }
    },
    [draftFilters, executedQuery.sortBy, executedQuery.sortOrder, strategies, updateTargetId]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteStrategy(deleteTarget.id);
      setStrategies((previous) => previous.filter((strategy) => strategy.id !== deleteTarget.id));
      setActiveId((previous) => (previous === String(deleteTarget.id) ? null : previous));
      setDeleteTarget(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : '删除策略失败');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTarget]);

  const editTarget = strategies.find((strategy) => strategy.id === updateTargetId);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xl"
        fullWidth
        fullScreen={fullScreen}
        scroll="paper"
        slotProps={{ paper: { sx: { width: { lg: '92vw' }, height: { md: '90vh' } } } }}
      >
        <DialogTitle sx={{ py: 1.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography component="span" variant="h6" sx={{ display: 'block' }}>
                股票选股器
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                全部启用条件严格 AND 匹配
              </Typography>
            </Box>
            <Button
              color="inherit"
              size="small"
              startIcon={<Iconify icon="solar:close-circle-bold" width={18} />}
              onClick={handleClose}
            >
              关闭
            </Button>
          </Stack>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            p: { xs: 1.5, sm: 2 },
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            overflow: 'hidden',
            overscrollBehavior: 'contain',
          }}
        >
          <ScreenerStrategyBar
            presets={presets}
            strategies={strategies}
            activeId={activeId}
            onSelect={handleSelect}
            onCustom={handleReset}
            onSave={() => {
              setUpdateTargetId(null);
              setSaveDialogOpen(true);
            }}
            onDelete={setDeleteTarget}
            onUpdate={handleOpenUpdate}
          />

          {error ? (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          ) : null}

          <Box
            sx={{
              minHeight: 0,
              flex: 1,
              display: { xs: 'block', lg: 'grid' },
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(360px, 400px) minmax(0, 1fr)' },
              gap: 1.5,
              overflow: 'auto',
              alignItems: 'start',
              '& > * + *': { mt: { xs: 1.5, lg: 0 } },
            }}
          >
            <ScreenerFilterPanel
              filters={draftFilters}
              industries={industries}
              areas={areas}
              concepts={concepts}
              onChange={handleFilterChange}
            />

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, minWidth: 0 }}>
              <ScreenerResultToolbar
                total={result?.total ?? 0}
                loading={loading}
                sortBy={executedQuery.sortBy}
                sortOrder={executedQuery.sortOrder}
                onSortChange={handleSortChange}
              />
              <Box sx={{ px: 2, pb: 1.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  最近一次已执行条件
                </Typography>
                {executedSummary.length === 0 ? (
                  <Typography variant="body2">全市场排序预览</Typography>
                ) : (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {executedSummary.map((summary) => (
                      <Chip key={summary} label={summary} size="small" variant="outlined" />
                    ))}
                  </Stack>
                )}
              </Box>
              <ScreenerEvidenceList
                items={result?.items ?? []}
                total={result?.total ?? 0}
                page={executedQuery.page}
                rowsPerPage={executedQuery.rowsPerPage}
                loading={loading}
                executedFilters={executedQuery.filters}
                conceptNames={conceptNames}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.25,
            position: 'sticky',
            bottom: 0,
            zIndex: 2,
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <Button variant="outlined" onClick={handleReset} disabled={loading}>
            重置条件
          </Button>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="caption" sx={{ color: dirty ? 'warning.main' : 'text.secondary' }}>
              {dirty ? '条件已修改，结果待更新' : '结果与执行条件一致'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:search-fill" />}
              onClick={handleSearch}
              disabled={loading}
              loading={loading}
            >
              开始选股
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除选股策略"
        content={`确定删除“${deleteTarget?.name ?? ''}”吗？此操作不可恢复。`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        submitting={deleteLoading}
        confirmLabel="删除"
        confirmColor="error"
      />
    </>
  );
}
