import type { SignalHistoryGroup, SignalActivationItem, SignalHistoryResponse } from 'src/api/signal';

import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import { getSignalHistory, listSignalActivations } from 'src/api/signal';

import { SignalEmptyState } from '../signal-empty-state';
import { SignalHistorySummary } from '../signal-history-summary';
import { SignalHistoryToolbar } from '../signal-history-toolbar';
import { SignalHistoryDayDrawer } from '../signal-history-day-drawer';
import { SignalHistoryGroupCard } from '../signal-history-group-card';

import type { SignalHistoryFilter } from '../signal-history-toolbar';

// ----------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 20;

export function SignalHistoryView() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [activations, setActivations] = useState<SignalActivationItem[]>([]);
  const [loadingActivations, setLoadingActivations] = useState(true);
  const [activationsError, setActivationsError] = useState('');

  const [history, setHistory] = useState<SignalHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const [drawerGroup, setDrawerGroup] = useState<SignalHistoryGroup | null>(null);

  const defaultFilter = useMemo(() => createDefaultFilter(activations), [activations]);
  const appliedFilter = useMemo(
    () => parseFilter(searchParams, defaultFilter),
    [defaultFilter, searchParams]
  );
  const [draft, setDraft] = useState<SignalHistoryFilter>(appliedFilter);

  const currentActivation = activations.find(
    (activation) => activation.strategyId === appliedFilter.strategyId
  );
  const hasDirty = !isSameFilter(draft, appliedFilter);

  const writeFilterToUrl = useCallback(
    (filter: SignalHistoryFilter, replace = true) => {
      setSearchParams(serializeFilter(filter), { replace });
    },
    [setSearchParams]
  );

  const fetchActivations = useCallback(async () => {
    setLoadingActivations(true);
    setActivationsError('');
    try {
      const data = await listSignalActivations();
      setActivations(data);
    } catch (err) {
      setActivationsError(err instanceof Error ? err.message : '获取策略信号列表失败');
    } finally {
      setLoadingActivations(false);
    }
  }, []);

  useEffect(() => {
    fetchActivations();
  }, [fetchActivations]);

  useEffect(() => {
    setDraft(appliedFilter);
  }, [appliedFilter]);

  // 首次进入时把默认筛选写入 URL，后续刷新/分享都以 URL 为准
  useEffect(() => {
    if (loadingActivations || activations.length === 0 || searchParams.get('strategyId')) return;
    writeFilterToUrl(createDefaultFilter(activations));
  }, [activations, loadingActivations, searchParams, writeFilterToUrl]);

  const fetchHistory = useCallback(async () => {
    if (!appliedFilter.strategyId) return;
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const data = await getSignalHistory({
        strategyId: appliedFilter.strategyId,
        startDate: appliedFilter.startDate || undefined,
        endDate: appliedFilter.endDate || undefined,
        actions: appliedFilter.actions.length > 0 ? appliedFilter.actions : undefined,
        stockKeyword: appliedFilter.stockKeyword || undefined,
        confidenceMin: appliedFilter.confidenceMin > 0 ? appliedFilter.confidenceMin : undefined,
        confidenceMax: appliedFilter.confidenceMax < 1 ? appliedFilter.confidenceMax : undefined,
        forwardWindow: appliedFilter.forwardWindow,
        viewMode: appliedFilter.viewMode,
        showHold: appliedFilter.showHold,
        page: appliedFilter.page,
        pageSize: appliedFilter.pageSize,
      });
      setHistory(data);
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : '获取信号历史失败');
    } finally {
      setLoadingHistory(false);
    }
  }, [appliedFilter]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleApply = () => {
    writeFilterToUrl({ ...draft, page: 1 });
  };

  const handleReset = () => {
    writeFilterToUrl(createDefaultFilter(activations));
  };

  const handlePageChange = (page: number) => {
    writeFilterToUrl({ ...appliedFilter, page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    writeFilterToUrl({ ...appliedFilter, page: 1, pageSize });
  };

  const totalPages = history ? Math.ceil(history.total / appliedFilter.pageSize) : 0;

  return (
    <DashboardContent>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4">信号历史</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {currentActivation
            ? `${currentActivation.strategyName} · ${formatDateRange(appliedFilter.startDate, appliedFilter.endDate)} · 最新信号 ${formatDate(currentActivation.lastSignalDate ?? '')}`
            : '按策略和日期复盘历史信号、前瞻收益与持仓变化'}
        </Typography>
      </Box>

      <SignalHistoryToolbar
        draft={draft}
        activations={activations}
        loadingActivations={loadingActivations}
        activationsError={activationsError}
        hasDirty={hasDirty}
        onDraftChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
        onApply={handleApply}
        onReset={handleReset}
        onRetryActivations={fetchActivations}
      />

      {!loadingActivations && activations.length === 0 && !activationsError && (
        <SignalEmptyState variant="noActivation" />
      )}

      {historyError && (
        <SignalEmptyState variant="error" message={historyError} onRetry={fetchHistory} />
      )}

      {loadingHistory && (
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={86} />
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      )}

      {!loadingHistory && !historyError && history && (
        <>
          <SignalHistorySummary history={history} forwardWindow={appliedFilter.forwardWindow} />

          {history.groups.length === 0 ? (
            <SignalEmptyState variant="filterNoMatch" onReset={handleReset} />
          ) : (
            <Stack spacing={2}>
              {history.groups.map((group, index) => (
                <SignalHistoryGroupCard
                  key={group.tradeDate}
                  group={group}
                  index={index}
                  forwardWindow={appliedFilter.forwardWindow}
                  showHold={appliedFilter.showHold}
                  viewMode={appliedFilter.viewMode}
                  alertThreshold={currentActivation?.alertThreshold}
                  onOpenDay={setDrawerGroup}
                />
              ))}
            </Stack>
          )}

          {totalPages > 1 && (
            <Box
              sx={{
                mt: 3,
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Pagination
                color="primary"
                count={totalPages}
                page={appliedFilter.page}
                onChange={(_, value) => handlePageChange(value)}
              />
              <Select
                size="small"
                value={appliedFilter.pageSize}
                onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                sx={{ width: 96 }}
              >
                {[10, 20, 50].map((size) => (
                  <MenuItem key={size} value={size}>
                    每页 {size}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2" color="text.secondary">
                共 {history.total} 条 · 第 {appliedFilter.page} / {totalPages} 页
              </Typography>
            </Box>
          )}
        </>
      )}

      <SignalHistoryDayDrawer
        open={Boolean(drawerGroup)}
        group={drawerGroup}
        forwardWindow={appliedFilter.forwardWindow}
        onClose={() => setDrawerGroup(null)}
      />
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function createDefaultFilter(activations: SignalActivationItem[]): SignalHistoryFilter {
  const today = dayjs();
  const firstActive = activations.find((activation) => activation.isActive) ?? activations[0];

  return {
    strategyId: firstActive?.strategyId ?? '',
    startDate: today.subtract(29, 'day').format('YYYYMMDD'),
    endDate: today.format('YYYYMMDD'),
    actions: [],
    stockKeyword: '',
    confidenceMin: 0,
    confidenceMax: 1,
    forwardWindow: 5,
    viewMode: 'raw',
    showHold: false,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

function parseFilter(params: URLSearchParams, fallback: SignalHistoryFilter): SignalHistoryFilter {
  const actions = (params.get('actions') ?? '')
    .split(',')
    .filter((value): value is SignalHistoryFilter['actions'][number] =>
      ['BUY', 'SELL', 'HOLD'].includes(value)
    );
  const forwardWindow = Number(params.get('forwardWindow'));
  const viewMode = params.get('viewMode') === 'position' ? 'position' : 'raw';
  const pageSize = Number(params.get('pageSize'));

  return {
    strategyId: params.get('strategyId') ?? fallback.strategyId,
    startDate: params.get('startDate') ?? fallback.startDate,
    endDate: params.get('endDate') ?? fallback.endDate,
    actions,
    stockKeyword: params.get('stockKeyword') ?? '',
    confidenceMin: clamp01(Number(params.get('confidenceMin') ?? fallback.confidenceMin)),
    confidenceMax: clamp01(Number(params.get('confidenceMax') ?? fallback.confidenceMax)),
    forwardWindow: forwardWindow === 1 || forwardWindow === 20 ? forwardWindow : 5,
    viewMode,
    showHold: params.get('showHold') === '1',
    page: Math.max(1, Number(params.get('page') ?? fallback.page)),
    pageSize: [10, 20, 50].includes(pageSize) ? pageSize : fallback.pageSize,
  };
}

function serializeFilter(filter: SignalHistoryFilter) {
  const params = new URLSearchParams();
  if (filter.strategyId) params.set('strategyId', filter.strategyId);
  if (filter.startDate) params.set('startDate', filter.startDate);
  if (filter.endDate) params.set('endDate', filter.endDate);
  if (filter.actions.length > 0) params.set('actions', filter.actions.join(','));
  if (filter.stockKeyword) params.set('stockKeyword', filter.stockKeyword);
  if (filter.confidenceMin > 0) params.set('confidenceMin', String(filter.confidenceMin));
  if (filter.confidenceMax < 1) params.set('confidenceMax', String(filter.confidenceMax));
  if (filter.forwardWindow !== 5) params.set('forwardWindow', String(filter.forwardWindow));
  if (filter.viewMode !== 'raw') params.set('viewMode', filter.viewMode);
  if (filter.showHold) params.set('showHold', '1');
  if (filter.page > 1) params.set('page', String(filter.page));
  if (filter.pageSize !== DEFAULT_PAGE_SIZE) params.set('pageSize', String(filter.pageSize));
  return params;
}

function isSameFilter(a: SignalHistoryFilter, b: SignalHistoryFilter) {
  return (
    JSON.stringify({ ...a, actions: [...a.actions].sort() }) ===
    JSON.stringify({ ...b, actions: [...b.actions].sort() })
  );
}

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function formatDateRange(startDate: string, endDate: string) {
  return `${formatDate(startDate)} → ${formatDate(endDate)}`;
}

function formatDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value || '—';
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}
