import type { Dayjs } from 'dayjs';
import type {
  SignalDiffFromPrev,
  LatestSignalResponse,
  SignalActivationItem,
} from 'src/api/signal';

import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getLatestSignals, listSignalActivations } from 'src/api/signal';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { SignalEmptyState } from '../signal-empty-state';
import { SignalDetailPanel } from '../signal-detail-panel';
import { SignalDiffSection } from '../signal-diff-section';
import { SignalStatusBanner } from '../signal-status-banner';
import { SignalLatestActions } from '../signal-latest-actions';
import { SignalLatestSummary } from '../signal-latest-summary';
import { SignalActivationCard } from '../signal-activation-card';
import {
  lastTradingDayjs,
  dayjsToTradeDate,
  tradeDateToDayjs,
  SIGNAL_DATE_FORMAT,
  shouldDisableWeekend,
  computeFrontendSignalDiff,
} from '../signal-latest-utils';

export function SignalLatestView() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryStrategyId = searchParams.get('strategyId') ?? '';
  const queryTradeDate = searchParams.get('tradeDate') ?? '';

  const [activations, setActivations] = useState<SignalActivationItem[]>([]);
  const [loadingActivations, setLoadingActivations] = useState(true);
  const [activationsError, setActivationsError] = useState('');

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(queryStrategyId);
  const [tradeDate, setTradeDate] = useState<Dayjs | null>(tradeDateToDayjs(queryTradeDate));

  const [latestSignals, setLatestSignals] = useState<LatestSignalResponse | null>(null);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [signalsError, setSignalsError] = useState('');

  const [fallbackDiff, setFallbackDiff] = useState<SignalDiffFromPrev | null>(null);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });
  const activationsRequestIdRef = useRef(0);
  const signalsRequestIdRef = useRef(0);
  const selectedStrategyIdRef = useRef(selectedStrategyId);
  const signalsInFlightRef = useRef<{ key: string; promise: Promise<void> } | null>(null);

  selectedStrategyIdRef.current = selectedStrategyId;

  const beginSignalsTransition = useCallback((hasSelection: boolean) => {
    signalsRequestIdRef.current += 1;
    signalsInFlightRef.current = null;
    setLatestSignals(null);
    setFallbackDiff(null);
    setSignalsError('');
    setLoadingSignals(hasSelection);
  }, []);

  const selectStrategy = useCallback(
    (strategyId: string) => {
      if (strategyId === selectedStrategyId) return;
      beginSignalsTransition(Boolean(strategyId));
      setSelectedStrategyId(strategyId);
    },
    [beginSignalsTransition, selectedStrategyId]
  );

  const selectTradeDate = useCallback(
    (nextTradeDate: Dayjs | null) => {
      if (dayjsToTradeDate(nextTradeDate) === dayjsToTradeDate(tradeDate)) return;
      beginSignalsTransition(Boolean(selectedStrategyId));
      setTradeDate(nextTradeDate);
    },
    [beginSignalsTransition, selectedStrategyId, tradeDate]
  );

  const anchorRefs = useRef<Record<'BUY' | 'SELL' | 'HOLD', HTMLElement | null>>({
    BUY: null,
    SELL: null,
    HOLD: null,
  });

  const registerAnchor = useCallback((action: 'BUY' | 'SELL' | 'HOLD', el: HTMLElement | null) => {
    anchorRefs.current[action] = el;
  }, []);

  const handleJumpToAction = useCallback((action: 'BUY' | 'SELL' | 'HOLD') => {
    const el = anchorRefs.current[action];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (selectedStrategyId) next.set('strategyId', selectedStrategyId);
    else next.delete('strategyId');
    const td = dayjsToTradeDate(tradeDate);
    if (td) next.set('tradeDate', td);
    else next.delete('tradeDate');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStrategyId, tradeDate]);

  const fetchActivations = useCallback(async () => {
    const requestId = activationsRequestIdRef.current + 1;
    activationsRequestIdRef.current = requestId;
    setLoadingActivations(true);
    setActivationsError('');
    try {
      const data = await listSignalActivations();
      if (activationsRequestIdRef.current !== requestId) return;
      setActivations(data);
      if (data.length > 0 && !selectedStrategyIdRef.current) {
        const fromQuery = queryStrategyId
          ? data.find((a) => a.strategyId === queryStrategyId)
          : null;
        const firstActive = data.find((a) => a.isActive);
        const selected = fromQuery ?? firstActive ?? data[0];
        beginSignalsTransition(true);
        setSelectedStrategyId(selected.strategyId);
      }
    } catch (err: unknown) {
      if (activationsRequestIdRef.current !== requestId) return;
      setActivationsError(err instanceof Error ? err.message : '获取激活策略列表失败');
    } finally {
      if (activationsRequestIdRef.current === requestId) setLoadingActivations(false);
    }
  }, [beginSignalsTransition, queryStrategyId]);

  useEffect(() => {
    fetchActivations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLatestSignals = useCallback(async () => {
    const strategyId = selectedStrategyId;
    const td = dayjsToTradeDate(tradeDate);
    if (!strategyId) {
      signalsRequestIdRef.current += 1;
      signalsInFlightRef.current = null;
      setLatestSignals(null);
      setFallbackDiff(null);
      setSignalsError('');
      setLoadingSignals(false);
      return;
    }

    const requestKey = `${strategyId}:${td || 'latest'}`;
    const existing = signalsInFlightRef.current;
    if (existing?.key === requestKey) {
      await existing.promise;
      return;
    }

    const requestId = signalsRequestIdRef.current + 1;
    signalsRequestIdRef.current = requestId;
    setLoadingSignals(true);
    setSignalsError('');
    setLatestSignals(null);
    setFallbackDiff(null);

    const request = (async () => {
      try {
        const data = await getLatestSignals({
          strategyId,
          ...(td ? { tradeDate: td } : {}),
        });
        if (signalsRequestIdRef.current !== requestId) return;
        const head = data.length > 0 ? data[0] : null;
        setLatestSignals(head);

        // 后端无 diff 时前端兜底；主请求和兜底请求共享同一 generation。
        if (head && !head.diffFromPrev) {
          const prevDate = lastTradingDayjs(
            (tradeDate ?? dayjs(head.tradeDate, SIGNAL_DATE_FORMAT)).subtract(1, 'day')
          );
          try {
            const prevResp = await getLatestSignals({
              strategyId,
              tradeDate: prevDate.format(SIGNAL_DATE_FORMAT),
            });
            if (signalsRequestIdRef.current !== requestId) return;
            const prev = prevResp.length > 0 ? prevResp[0] : null;
            if (prev) {
              setFallbackDiff(computeFrontendSignalDiff(head.signals, prev.signals, prev.tradeDate));
            }
          } catch {
            /* 兜底失败不阻塞主流程 */
          }
        }
      } catch (err: unknown) {
        if (signalsRequestIdRef.current !== requestId) return;
        setSignalsError(err instanceof Error ? err.message : '获取最新信号失败');
      } finally {
        if (signalsRequestIdRef.current === requestId) setLoadingSignals(false);
      }
    })();

    signalsInFlightRef.current = { key: requestKey, promise: request };
    try {
      await request;
    } finally {
      if (signalsInFlightRef.current?.promise === request) signalsInFlightRef.current = null;
    }
  }, [selectedStrategyId, tradeDate]);

  useEffect(() => {
    fetchLatestSignals();
  }, [fetchLatestSignals]);

  useEffect(
    () => () => {
      activationsRequestIdRef.current += 1;
      signalsRequestIdRef.current += 1;
      signalsInFlightRef.current = null;
    },
    []
  );

  // ── 复制委托清单 ──────────────────────────────────────
  const handleCopyOrders = useCallback(async () => {
    if (!latestSignals) return;
    const rows = latestSignals.signals.filter((s) => s.action === 'BUY' || s.action === 'SELL');
    if (rows.length === 0) {
      setSnackbar({ open: true, message: '当前无可执行的 BUY/SELL 信号' });
      return;
    }
    const header = 'tsCode,股票名,操作,目标权重(%),建议手数';
    const lines = rows.map(
      (s) =>
        `${s.tsCode},${s.stockName},${s.action},${
          s.targetWeight != null ? (s.targetWeight * 100).toFixed(2) : ''
        },${s.estimatedShares ?? ''}`
    );
    const csv = [header, ...lines].join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      setSnackbar({ open: true, message: `已复制 ${rows.length} 条委托清单` });
    } catch {
      setSnackbar({ open: true, message: '复制失败，请手动选中表格内容' });
    }
  }, [latestSignals]);

  // ── 派生数据 ─────────────────────────────────────────
  const diff = latestSignals?.diffFromPrev ?? fallbackDiff;
  const diffIsFallback = Boolean(!latestSignals?.diffFromPrev && fallbackDiff);
  const hasPortfolio = Boolean(latestSignals?.portfolioId);

  const orderedActivations = useMemo(
    () =>
      [...activations].sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return (b.lastSignalCount ?? 0) - (a.lastSignalCount ?? 0);
      }),
    [activations]
  );

  const useGrid = orderedActivations.length <= 6;

  // ── 渲染 ─────────────────────────────────────────────
  return (
    <DashboardContent>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4">最新信号</Typography>
          <Typography variant="caption" color="text.secondary">
            T 日收盘后跑批，面向 T+1 开盘的执行清单
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
          <TextField
            select
            size="small"
            label="策略"
            value={selectedStrategyId}
            onChange={(event) => selectStrategy(event.target.value)}
            sx={{ minWidth: 180 }}
            disabled={loadingActivations}
          >
            {orderedActivations.map((a) => (
              <MenuItem key={a.strategyId} value={a.strategyId} disabled={!a.isActive}>
                {a.strategyName}
                {!a.isActive ? ' (已停用)' : ''}
              </MenuItem>
            ))}
          </TextField>

          <DatePicker
            label="交易日"
            value={tradeDate}
            onChange={selectTradeDate}
            shouldDisableDate={shouldDisableWeekend}
          />

          <ButtonGroup size="medium" variant="outlined">
            <Button onClick={() => selectTradeDate(lastTradingDayjs())}>今日</Button>
            <Button onClick={() => selectTradeDate(lastTradingDayjs(dayjs().subtract(1, 'day')))}>
              昨日
            </Button>
            <Button onClick={() => selectTradeDate(null)}>最近</Button>
          </ButtonGroup>

          <Tooltip title="刷新">
            <IconButton onClick={fetchLatestSignals} disabled={loadingSignals} aria-label="刷新">
              <Iconify icon="solar:refresh-bold" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <SignalLatestActions
        data={latestSignals}
        onCopyOrders={handleCopyOrders}
        onViewHistory={() => {
          const params = new URLSearchParams();
          if (selectedStrategyId) params.set('strategyId', selectedStrategyId);
          router.push(`/strategy/signal/history?${params.toString()}`);
        }}
      />

      {/* 状态 banner */}
      {latestSignals ? (
        <SignalStatusBanner
          status={latestSignals.status}
          lastRunAt={latestSignals.lastRunAt}
          lastRunError={latestSignals.lastRunError}
          onRetry={fetchLatestSignals}
        />
      ) : null}

      {/* 错误 */}
      {activationsError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {activationsError}
        </Alert>
      ) : null}

      {/* loading 激活 */}
      {loadingActivations ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : null}

      {/* 完全空 */}
      {!loadingActivations && !activationsError && activations.length === 0 ? (
        <SignalEmptyState variant="no-activation" />
      ) : null}

      {/* 主体 */}
      {!loadingActivations && activations.length > 0 ? (
        <>
          {useGrid ? (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {orderedActivations.map((a) => (
                <Grid key={a.strategyId} size={{ xs: 12, sm: 6, md: 4 }}>
                  <SignalActivationCard
                    activation={a}
                    selected={a.strategyId === selectedStrategyId}
                    onClick={() => {
                      if (a.isActive) selectStrategy(a.strategyId);
                      else router.push(`/strategy/${a.strategyId}`);
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box
              sx={{
                mb: 3,
                maxHeight: 320,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                pr: 1,
              }}
            >
              {orderedActivations.map((a) => (
                <SignalActivationCard
                  key={a.strategyId}
                  activation={a}
                  selected={a.strategyId === selectedStrategyId}
                  onClick={() => {
                    if (a.isActive) selectStrategy(a.strategyId);
                    else router.push(`/strategy/${a.strategyId}`);
                  }}
                />
              ))}
            </Box>
          )}

          {signalsError ? (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button color="inherit" size="small" onClick={fetchLatestSignals}>
                  重试
                </Button>
              }
            >
              {signalsError}
            </Alert>
          ) : null}

          {loadingSignals ? (
            <Box>
              <Skeleton height={120} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" height={80} sx={{ mb: 2 }} />
              <Skeleton variant="rounded" height={240} />
            </Box>
          ) : null}

          {!loadingSignals && !signalsError && latestSignals ? (
            <>
              <SignalLatestSummary data={latestSignals} onJumpToAction={handleJumpToAction} />

              {latestSignals.signals.length === 0 ? (
                <SignalEmptyState variant="no-signal" strategyId={selectedStrategyId} />
              ) : (
                <>
                  <SignalDiffSection diff={diff ?? null} fallback={diffIsFallback} />
                  <SignalDetailPanel
                    signals={latestSignals.signals}
                    hasPortfolio={hasPortfolio}
                    registerAnchor={registerAnchor}
                    onCopyOrders={handleCopyOrders}
                  />
                </>
              )}
            </>
          ) : null}

          {!loadingSignals && !signalsError && !latestSignals && selectedStrategyId ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              该交易日无信号数据
            </Typography>
          ) : null}
        </>
      ) : null}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={1800}
        onClose={() => setSnackbar({ open: false, message: '' })}
        message={snackbar.message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardContent>
  );
}
