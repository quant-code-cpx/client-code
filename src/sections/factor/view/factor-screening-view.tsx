import type { LocalPreset } from 'src/sections/factor/screening/use-local-presets';
import type {
  FactorDef,
  ScreeningItem,
  FactorCondition,
  FactorLibraryResult,
  FactorScreeningResult,
} from 'src/api/factor';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { factorApi } from 'src/api/factor';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { StockWatchlistBatchDialog } from 'src/sections/stock/stock-watchlist-batch-dialog';

import {
  PAGE_SIZE,
  EMPTY_CONDITION,
  useLocalPresets,
  ScreeningQueryBar,
  ScreeningActionBar,
  validateConditions,
  StockEvidenceDrawer,
  pickValidConditions,
  ScreeningResultTable,
  ScreeningPresetDialog,
  ScreeningFunnelPreview,
  useScreeningQueryState,
  ScreeningResultKpiStrip,
  ScreeningConditionBuilder,
  ScreeningDiagnosticsPanel,
} from '../screening';

// ----------------------------------------------------------------------

type ToastState = {
  open: boolean;
  severity: 'success' | 'info' | 'warning' | 'error';
  message: string;
};

type ResultTab = 'table' | 'diagnostics' | 'log';

// ----------------------------------------------------------------------

export function FactorScreeningView() {
  const { state, patch } = useScreeningQueryState();

  const [library, setLibrary] = useState<FactorLibraryResult | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState('');

  const [conditions, setConditions] = useState<FactorCondition[]>(() =>
    state.conditions.length > 0 ? state.conditions : [{ ...EMPTY_CONDITION }]
  );

  const [result, setResult] = useState<FactorScreeningResult | null>(null);
  const [resultSnapshot, setResultSnapshot] = useState<FactorCondition[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<ResultTab>('table');
  const [evidenceItem, setEvidenceItem] = useState<ScreeningItem | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [actionLog, setActionLog] = useState<
    { time: string; message: string; severity: 'success' | 'warning' | 'error' | 'info' }[]
  >([]);
  const [toast, setToast] = useState<ToastState>({
    open: false,
    severity: 'info',
    message: '',
  });

  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const { presets, save: savePresetLocal, remove: removePreset } = useLocalPresets();

  const fetchLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError('');
    try {
      const data = await factorApi.library({ enabledOnly: true });
      setLibrary(data);
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : '加载因子库失败');
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const allFactors = useMemo<FactorDef[]>(
    () => library?.categories.flatMap((c) => c.factors) ?? [],
    [library]
  );

  const factorLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    allFactors.forEach((f) => m.set(f.name, f.label));
    return m;
  }, [allFactors]);

  const validation = useMemo(() => validateConditions(conditions), [conditions]);

  const isStale = useMemo(() => {
    if (!result) return false;
    return JSON.stringify(pickValidConditions(conditions)) !== JSON.stringify(resultSnapshot);
  }, [conditions, resultSnapshot, result]);

  const factorOptions = useMemo(
    () =>
      conditions
        .map((c) => c.factorName)
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .map((name) => ({ name, label: factorLabelMap.get(name) ?? name })),
    [conditions, factorLabelMap]
  );

  // 同步条件 -> URL（仅写入合法条件）
  useEffect(() => {
    const valid = pickValidConditions(conditions);
    patch({ conditions: valid });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditions]);

  const handleRun = useCallback(
    async (targetPage = 0) => {
      if (!validation.ok) {
        setError(validation.global[0] ?? '请检查条件填写');
        return;
      }
      const valid = pickValidConditions(conditions);
      if (valid.length === 0) {
        setError('请至少添加一条已完整填写的有效条件');
        return;
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      const seq = ++requestSeqRef.current;

      setLoading(true);
      setError('');

      try {
        const data = await factorApi.screening({
          conditions: valid,
          tradeDate: state.tradeDate,
          universe: state.universe || undefined,
          sortBy: state.sortMode === 'single' && state.sortBy ? state.sortBy : undefined,
          sortOrder: state.sortOrder,
          page: targetPage + 1,
          pageSize: PAGE_SIZE,
          tradeConstraints: state.tradeConstraints,
          withSummary: true,
          withConditionPassCounts: true,
          withDiagnostics: true,
        });

        if (ac.signal.aborted || seq !== requestSeqRef.current) return;
        setResult(data);
        setResultSnapshot(valid);
        setPage(targetPage);
        setSelected(new Set());
        setActionLog((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            message: `运行选股成功，命中 ${data.total} 只`,
            severity: 'success',
          },
          ...prev.slice(0, 19),
        ]);
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : '选股失败');
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [conditions, state, validation]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      handleRun(newPage);
    },
    [handleRun]
  );

  const toggleRow = useCallback((tsCode: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tsCode)) next.delete(tsCode);
      else next.add(tsCode);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (next: boolean) => {
      if (!result) return;
      setSelected((prev) => {
        const set = new Set(prev);
        if (next) result.items.forEach((it) => set.add(it.tsCode));
        else result.items.forEach((it) => set.delete(it.tsCode));
        return set;
      });
    },
    [result]
  );

  const handleReset = useCallback(() => {
    setConditions([{ ...EMPTY_CONDITION }]);
    setResult(null);
    setResultSnapshot([]);
    setSelected(new Set());
    setPage(0);
    setError('');
  }, []);

  const handleLoadPreset = useCallback(
    (preset: LocalPreset) => {
      setConditions(
        preset.state.conditions.length > 0 ? preset.state.conditions : [{ ...EMPTY_CONDITION }]
      );
      patch({
        tradeDate: preset.state.tradeDate,
        universe: preset.state.universe,
        sortMode: preset.state.sortMode,
        sortBy: preset.state.sortBy,
        sortOrder: preset.state.sortOrder,
        tradeConstraints: preset.state.tradeConstraints,
      });
      setToast({
        open: true,
        severity: 'success',
        message: `已加载预设「${preset.name}」`,
      });
    },
    [patch]
  );

  const handleSavePreset = useCallback(
    (name: string) => {
      const res = savePresetLocal(name, {
        ...state,
        conditions: pickValidConditions(conditions),
      });
      if (!res.ok) {
        setToast({
          open: true,
          severity: 'warning',
          message: res.reason ?? '保存失败',
        });
      } else {
        setToast({
          open: true,
          severity: 'success',
          message: `已保存预设「${name}」`,
        });
      }
    },
    [savePresetLocal, state, conditions]
  );

  const targetTsCodes = useMemo(() => {
    if (!result) return [];
    if (selected.size > 0) return Array.from(selected);
    return result.items.map((it) => it.tsCode);
  }, [result, selected]);

  const handleAddToWatchlist = useCallback(() => {
    if (targetTsCodes.length === 0) return;
    setWatchlistOpen(true);
  }, [targetTsCodes.length]);

  const handleSaveStrategy = useCallback(() => {
    setToast({
      open: true,
      severity: 'info',
      message: '保存策略需后端 BE-12 字段对齐，已记入待办',
    });
    setActionLog((prev) => [
      {
        time: new Date().toLocaleTimeString(),
        message: '保存策略动作触发，但后端契约未对齐',
        severity: 'warning',
      },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const handleQuickBacktest = useCallback(() => {
    setToast({
      open: true,
      severity: 'info',
      message: '快速回测请前往因子详情页（阶段二未集成）',
    });
  }, []);

  const handleCreateSubscription = useCallback(() => {
    setToast({
      open: true,
      severity: 'info',
      message: '条件订阅需要 BE-11 扩展，暂未启用',
    });
  }, []);

  const factorColumns = useMemo(
    () =>
      resultSnapshot
        .map((c) => c.factorName)
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i),
    [resultSnapshot]
  );

  return (
    <DashboardContent>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
      >
        <Box>
          <Typography variant="h4">因子选股</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            研究工作台 · 在指定交易日的因子横截面里筛选候选股票
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:notebook-bookmark-bold" width={16} />}
            onClick={() => setPresetOpen(true)}
          >
            预设
          </Button>
        </Stack>
      </Stack>

      <ScreeningQueryBar
        tradeDate={state.tradeDate}
        universe={state.universe}
        sortMode={state.sortMode}
        sortBy={state.sortBy}
        sortOrder={state.sortOrder}
        tradeConstraints={state.tradeConstraints}
        factorOptions={factorOptions}
        loading={loading}
        isStale={isStale}
        onChange={patch}
        onRun={() => handleRun(0)}
        onReset={handleReset}
      />

      {libraryError !== '' && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchLibrary}>
              重试
            </Button>
          }
        >
          {libraryError}
        </Alert>
      )}

      {libraryLoading ? (
        <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, mb: 3 }} />
      ) : (
        <ScreeningConditionBuilder
          conditions={conditions}
          allFactors={allFactors}
          validation={validation}
          onChange={setConditions}
        />
      )}

      <ScreeningFunnelPreview data={result?.conditionPassCounts} allFactors={allFactors} />

      {error !== '' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <ScreeningResultKpiStrip result={result} />

      <Card sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v: ResultTab) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="table" label="结果表" />
          <Tab value="diagnostics" label="诊断" />
          <Tab value="log" label={`动作日志 (${actionLog.length})`} />
        </Tabs>

        {tab === 'table' && (
          <ScreeningResultTable
            result={result}
            loading={loading}
            factorColumns={factorColumns}
            factorLabelMap={factorLabelMap}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            selected={selected}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
            onOpenEvidence={setEvidenceItem}
            isStale={isStale}
          />
        )}

        {tab === 'diagnostics' && (
          <Box sx={{ p: 2 }}>
            <ScreeningDiagnosticsPanel result={result} />
          </Box>
        )}

        {tab === 'log' && (
          <Box sx={{ p: 2 }}>
            {actionLog.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                暂无动作记录。
              </Typography>
            ) : (
              <Stack spacing={1}>
                {actionLog.map((it, i) => (
                  <Alert key={i} severity={it.severity} variant="outlined" sx={{ py: 0.5 }}>
                    <Box component="span" sx={{ color: 'text.disabled', mr: 1 }}>
                      {it.time}
                    </Box>
                    {it.message}
                  </Alert>
                ))}
              </Stack>
            )}
          </Box>
        )}
      </Card>

      {result && (
        <ScreeningActionBar
          selectedCount={selected.size}
          totalCount={result.total}
          canSavePreset={pickValidConditions(conditions).length > 0}
          onClearSelection={() => setSelected(new Set())}
          onAddToWatchlist={handleAddToWatchlist}
          onSavePreset={() => setPresetOpen(true)}
          onSaveStrategy={handleSaveStrategy}
          onQuickBacktest={handleQuickBacktest}
          onCreateSubscription={handleCreateSubscription}
        />
      )}

      <Box sx={{ mt: 4, py: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          数据来源：Tushare · 仅供参考，不构成投资建议
        </Typography>
      </Box>

      <StockEvidenceDrawer
        open={evidenceItem !== null}
        item={evidenceItem}
        conditions={resultSnapshot}
        allFactors={allFactors}
        onClose={() => setEvidenceItem(null)}
      />

      <ScreeningPresetDialog
        open={presetOpen}
        presets={presets}
        onClose={() => setPresetOpen(false)}
        onSave={handleSavePreset}
        onLoad={handleLoadPreset}
        onRemove={removePreset}
      />

      <StockWatchlistBatchDialog
        open={watchlistOpen}
        tsCodes={targetTsCodes}
        onClose={() => setWatchlistOpen(false)}
        onSuccess={(added, skipped) => {
          setActionLog((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              message: `加入自选股：成功 ${added} 只 / 跳过 ${skipped} 只`,
              severity: 'success',
            },
            ...prev.slice(0, 19),
          ]);
          setToast({
            open: true,
            severity: 'success',
            message: `已加入自选股 ${added} 只（跳过 ${skipped} 只）`,
          });
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
