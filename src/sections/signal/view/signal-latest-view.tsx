import type { Dayjs } from 'dayjs';
import type {
  TradingSignalItem,
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
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import { getLatestSignals, listSignalActivations } from 'src/api/signal';

import { Iconify } from 'src/components/iconify';

import { SignalEmptyState } from '../signal-empty-state';
import { SignalDetailPanel } from '../signal-detail-panel';
import { SignalDiffSection } from '../signal-diff-section';
import { SignalStatusBanner } from '../signal-status-banner';
import { SignalLatestSummary } from '../signal-latest-summary';
import { SignalActivationCard } from '../signal-activation-card';

// ----------------------------------------------------------------------

const DATE_FMT = 'YYYYMMDD';

function dayjsToTradeDate(d: Dayjs | null): string {
  return d ? d.format(DATE_FMT) : '';
}

function tradeDateToDayjs(s: string): Dayjs | null {
  if (!s) return null;
  const d = dayjs(s, DATE_FMT);
  return d.isValid() ? d : null;
}

function lastTradingDayjs(from: Dayjs = dayjs()): Dayjs {
  let d = from;
  // 周日=0，周六=6
  while (d.day() === 0 || d.day() === 6) d = d.subtract(1, 'day');
  return d;
}

function shouldDisableWeekend(d: Dayjs): boolean {
  return d.day() === 0 || d.day() === 6;
}

// ----------------------------------------------------------------------

function computeFrontendDiff(
  current: TradingSignalItem[],
  previous: TradingSignalItem[],
  prevTradeDate: string
): SignalDiffFromPrev {
  const prevMap = new Map(previous.map((s) => [s.tsCode, s]));
  const curMap = new Map(current.map((s) => [s.tsCode, s]));

  const added: TradingSignalItem[] = [];
  const removed: TradingSignalItem[] = [];
  const rebalanced: SignalDiffFromPrev['rebalanced'] = [];

  current.forEach((c) => {
    if (c.action === 'HOLD') return;
    const prev = prevMap.get(c.tsCode);
    if (!prev) added.push(c);
  });

  previous.forEach((p) => {
    if (p.action === 'HOLD') return;
    if (!curMap.get(p.tsCode)) removed.push(p);
  });

  current.forEach((c) => {
    const p = prevMap.get(c.tsCode);
    if (!p) return;
    const cw = c.targetWeight ?? 0;
    const pw = p.targetWeight ?? 0;
    if (Math.abs(cw - pw) > 0.0001) {
      rebalanced.push({
        tsCode: c.tsCode,
        stockName: c.stockName,
        prevWeight: pw,
        newWeight: cw,
        delta: cw - pw,
      });
    }
  });

  return { prevTradeDate, added, removed, rebalanced };
}

// ----------------------------------------------------------------------

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

  // 滚动锚点
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

  // ── URL 持久化 ────────────────────────────────────────
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

  // ── 拉取激活列表 ──────────────────────────────────────
  const fetchActivations = useCallback(async () => {
    setLoadingActivations(true);
    setActivationsError('');
    try {
      const data = await listSignalActivations();
      setActivations(data);
      if (data.length > 0 && !selectedStrategyId) {
        const fromQuery = queryStrategyId
          ? data.find((a) => a.strategyId === queryStrategyId)
          : null;
        const firstActive = data.find((a) => a.isActive);
        const selected = fromQuery ?? firstActive ?? data[0];
        setSelectedStrategyId(selected.strategyId);
      }
    } catch (err: unknown) {
      setActivationsError(err instanceof Error ? err.message : '获取激活策略列表失败');
    } finally {
      setLoadingActivations(false);
    }
  }, [queryStrategyId, selectedStrategyId]);

  useEffect(() => {
    fetchActivations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 拉取最新信号（含兜底 diff） ───────────────────────
  const fetchLatestSignals = useCallback(async () => {
    if (!selectedStrategyId) return;
    setLoadingSignals(true);
    setSignalsError('');
    setFallbackDiff(null);
    try {
      const td = dayjsToTradeDate(tradeDate);
      const data = await getLatestSignals({
        strategyId: selectedStrategyId,
        ...(td ? { tradeDate: td } : {}),
      });
      const head = data.length > 0 ? data[0] : null;
      setLatestSignals(head);

      // 后端无 diff 时前端兜底
      if (head && !head.diffFromPrev) {
        const prevDate = lastTradingDayjs(
          (tradeDate ?? dayjs(head.tradeDate, DATE_FMT)).subtract(1, 'day')
        );
        try {
          const prevResp = await getLatestSignals({
            strategyId: selectedStrategyId,
            tradeDate: prevDate.format(DATE_FMT),
          });
          const prev = prevResp.length > 0 ? prevResp[0] : null;
          if (prev) {
            setFallbackDiff(computeFrontendDiff(head.signals, prev.signals, prev.tradeDate));
          }
        } catch {
          /* 兜底失败不阻塞主流程 */
        }
      }
    } catch (err: unknown) {
      setSignalsError(err instanceof Error ? err.message : '获取最新信号失败');
    } finally {
      setLoadingSignals(false);
    }
  }, [selectedStrategyId, tradeDate]);

  useEffect(() => {
    fetchLatestSignals();
  }, [fetchLatestSignals]);

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
            onChange={(e) => setSelectedStrategyId(e.target.value)}
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
            format="YYYY-MM-DD"
            value={tradeDate}
            onChange={(d) => setTradeDate(d)}
            shouldDisableDate={shouldDisableWeekend}
            slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
          />

          <ButtonGroup size="small" variant="outlined">
            <Button onClick={() => setTradeDate(lastTradingDayjs())}>今日</Button>
            <Button onClick={() => setTradeDate(lastTradingDayjs(dayjs().subtract(1, 'day')))}>
              昨日
            </Button>
            <Button onClick={() => setTradeDate(null)}>最近</Button>
          </ButtonGroup>

          <Tooltip title="刷新">
            <IconButton onClick={fetchLatestSignals} disabled={loadingSignals}>
              <Iconify icon="solar:refresh-bold" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* 操作按钮组 */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap">
        <Button
          variant="outlined"
          startIcon={<Iconify icon="solar:copy-bold" width={16} />}
          onClick={handleCopyOrders}
          disabled={!latestSignals || latestSignals.signals.length === 0}
        >
          复制委托清单
        </Button>
        <Tooltip title="后端 portfolio/sync-from-signal 接口待上线">
          <span>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:share-bold" width={16} />}
              disabled
            >
              推送至关联组合
            </Button>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="text"
          endIcon={<Iconify icon="solar:arrow-right-bold" width={16} />}
          onClick={() => {
            const params = new URLSearchParams();
            if (selectedStrategyId) params.set('strategyId', selectedStrategyId);
            router.push(`/strategy/signal/history?${params.toString()}`);
          }}
        >
          查看信号历史
        </Button>
      </Stack>

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
                      if (a.isActive) setSelectedStrategyId(a.strategyId);
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
                    if (a.isActive) setSelectedStrategyId(a.strategyId);
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
