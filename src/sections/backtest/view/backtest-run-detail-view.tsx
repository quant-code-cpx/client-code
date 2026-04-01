import type { BacktestTradeItem, BacktestEquityPoint, BacktestPositionItem, BacktestRebalanceLogItem, BacktestRunDetailResponse } from 'src/api/backtest';

import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  cancelRun,
  getRunDetail,
  getRunEquity,
  getRunTrades,
  getRunPositions,
  getRunRebalanceLogs,
} from 'src/api/backtest';

import { useBacktestJob } from '../hooks/use-backtest-job';
import { BacktestMetricsGrid } from '../backtest-metrics-grid';
import { BacktestEquityChart } from '../backtest-equity-chart';
import { BacktestTradesTable } from '../backtest-trades-table';
import { BacktestDetailHeader } from '../backtest-detail-header';
import { BacktestConfigDrawer } from '../backtest-config-drawer';
import { BacktestDrawdownChart } from '../backtest-drawdown-chart';
import { BacktestProgressBanner } from '../backtest-progress-banner';
import { BacktestPositionsTable } from '../backtest-positions-table';
import { BacktestRebalanceLogTable } from '../backtest-rebalance-log-table';
import { BacktestMonthlyReturnTable } from '../backtest-monthly-return-table';

// ----------------------------------------------------------------------

type TabValue = 'trades' | 'positions' | 'logs' | 'config';

const TABS: Array<{ value: TabValue; label: string }> = [
  { value: 'trades', label: '交易明细' },
  { value: 'positions', label: '持仓快照' },
  { value: 'logs', label: '调仓日志' },
  { value: 'config', label: '运行配置' },
];

// ----------------------------------------------------------------------

export function BacktestRunDetailView() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();

  const [detail, setDetail] = useState<BacktestRunDetailResponse | null>(null);
  const [equity, setEquity] = useState<BacktestEquityPoint[]>([]);
  const [trades, setTrades] = useState<BacktestTradeItem[]>([]);
  const [tradesTotal, setTradesTotal] = useState(0);
  const [tradesPage, setTradesPage] = useState(0);
  const [tradesPageSize, setTradesPageSize] = useState(50);
  const [positions, setPositions] = useState<BacktestPositionItem[]>([]);
  const [positionDate, setPositionDate] = useState('');
  const [rebalanceLogs, setRebalanceLogs] = useState<BacktestRebalanceLogItem[]>([]);
  const [tab, setTab] = useState<TabValue>('trades');

  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingEquity, setLoadingEquity] = useState(false);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  // Track which tabs have been loaded
  const [loadedTabs, setLoadedTabs] = useState<Set<TabValue>>(new Set());

  // Load main detail + equity
  const loadDetail = useCallback(async () => {
    if (!runId) return;
    setLoadingDetail(true);
    setError('');
    try {
      const d = await getRunDetail(runId);
      setDetail(d);

      // Load equity after detail
      if (d.status === 'COMPLETED' || d.status === 'RUNNING') {
        setLoadingEquity(true);
        try {
          const eq = await getRunEquity(runId);
          setEquity(eq.points ?? []);
        } catch {
          // equity might not be ready yet
        } finally {
          setLoadingEquity(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取回测详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, [runId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // WebSocket subscription for running jobs
  useBacktestJob(detail?.jobId, {
    onProgress: (evt) => {
      setDetail((prev) =>
        prev ? { ...prev, progress: evt.progress } : prev
      );
    },
    onCompleted: () => {
      // Reload everything once complete
      loadDetail();
    },
    onFailed: (evt) => {
      setDetail((prev) =>
        prev ? { ...prev, status: 'FAILED', failedReason: evt.reason } : prev
      );
    },
  });

  // Load trades when tab is first activated
  useEffect(() => {
    if (tab === 'trades' && !loadedTabs.has('trades') && runId) {
      setLoadingTrades(true);
      getRunTrades(runId, tradesPage + 1, tradesPageSize)
        .then((res) => {
          setTrades(res.items ?? []);
          setTradesTotal(res.total);
          setLoadedTabs((prev) => new Set(prev).add('trades'));
        })
        .catch(() => {})
        .finally(() => setLoadingTrades(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, runId]);

  // Reload trades on pagination change
  useEffect(() => {
    if (!runId || !loadedTabs.has('trades')) return;
    setLoadingTrades(true);
    getRunTrades(runId, tradesPage + 1, tradesPageSize)
      .then((res) => {
        setTrades(res.items ?? []);
        setTradesTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoadingTrades(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradesPage, tradesPageSize]);

  // Load positions when tab is first activated
  useEffect(() => {
    if (tab === 'positions' && !loadedTabs.has('positions') && runId) {
      setLoadingPositions(true);
      getRunPositions(runId)
        .then((res) => {
          setPositions(res.items ?? []);
          setPositionDate(res.tradeDate ?? '');
          setLoadedTabs((prev) => new Set(prev).add('positions'));
        })
        .catch(() => {})
        .finally(() => setLoadingPositions(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, runId]);

  // Load rebalance logs when tab is first activated
  useEffect(() => {
    if (tab === 'logs' && !loadedTabs.has('logs') && runId) {
      setLoadingLogs(true);
      getRunRebalanceLogs(runId)
        .then((res) => {
          setRebalanceLogs(res.items ?? []);
          setLoadedTabs((prev) => new Set(prev).add('logs'));
        })
        .catch(() => {})
        .finally(() => setLoadingLogs(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, runId]);

  const handlePositionDateChange = useCallback(
    async (date: string) => {
      if (!runId) return;
      setPositionDate(date);
      setLoadingPositions(true);
      try {
        const res = await getRunPositions(runId, date || undefined);
        setPositions(res.items ?? []);
      } catch {
        //
      } finally {
        setLoadingPositions(false);
      }
    },
    [runId]
  );

  const handleCancel = useCallback(async () => {
    if (!runId) return;
    setCancelling(true);
    try {
      await cancelRun(runId);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败');
    } finally {
      setCancelling(false);
    }
  }, [runId, loadDetail]);

  const handleCopy = useCallback(() => {
    if (!detail) return;
    router.push('/backtest', {
      state: {
        templateId: detail.strategyType,
        strategyType: detail.strategyType,
        startDate: detail.startDate,
        endDate: detail.endDate,
        benchmarkTsCode: detail.benchmarkTsCode,
        universe: detail.universe,
        rebalanceFrequency: detail.rebalanceFrequency,
        priceMode: detail.priceMode,
        initialCapital: detail.initialCapital,
        strategyConfig: detail.strategyConfig,
      },
    });
  }, [detail, router]);

  // ── Render ─────────────────────────────────────────────────────────────

  if (loadingDetail && !detail) {
    return (
      <DashboardContent>
        <Skeleton height={60} sx={{ mb: 1 }} />
        <Skeleton height={30} width="60%" sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, mb: 3 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} height={90} variant="rounded" />
          ))}
        </Box>
        <Skeleton height={300} variant="rounded" />
      </DashboardContent>
    );
  }

  if (!detail) {
    return (
      <DashboardContent>
        <Alert severity="error">{error || '未找到回测任务'}</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      {/* Header */}
      <BacktestDetailHeader
        detail={detail}
        onCancel={handleCancel}
        onCopy={handleCopy}
        cancelling={cancelling}
      />

      {/* Progress banner */}
      {(detail.status === 'QUEUED' || detail.status === 'RUNNING') && (
        <Box sx={{ mt: 3 }}>
          <BacktestProgressBanner detail={detail} />
        </Box>
      )}

      {/* Failed reason */}
      {detail.status === 'FAILED' && detail.failedReason && (
        <Alert severity="error" sx={{ mt: 3 }}>
          回测失败：{detail.failedReason}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Metrics grid */}
      {detail.summary && (
        <Box sx={{ mt: 4 }}>
          <BacktestMetricsGrid summary={detail.summary} />
        </Box>
      )}

      {/* Charts */}
      {equity.length > 0 && (
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <BacktestEquityChart points={equity} />
          <BacktestDrawdownChart points={equity} />
          <BacktestMonthlyReturnTable points={equity} />
        </Box>
      )}

      {loadingEquity && (
        <Box sx={{ mt: 3 }}>
          <Skeleton height={300} variant="rounded" />
        </Box>
      )}

      {/* Detail tabs */}
      {detail.status === 'COMPLETED' && (
        <Box sx={{ mt: 4 }}>
          <Card>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v as TabValue)}
              sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              {TABS.map((t) => (
                <Tab key={t.value} value={t.value} label={t.label} />
              ))}
            </Tabs>

            <Divider />

            {/* Trades */}
            {tab === 'trades' && (
              <BacktestTradesTable
                items={trades}
                total={tradesTotal}
                page={tradesPage}
                pageSize={tradesPageSize}
                loading={loadingTrades}
                onPageChange={(p) => setTradesPage(p)}
                onPageSizeChange={(s) => {
                  setTradesPageSize(s);
                  setTradesPage(0);
                }}
              />
            )}

            {/* Positions */}
            {tab === 'positions' && (
              <Box>
                <Box sx={{ px: 2, pt: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    快照日期：
                  </Typography>
                  <TextField
                    type="date"
                    size="small"
                    value={positionDate}
                    onChange={(e) => handlePositionDateChange(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    sx={{ width: 160 }}
                  />
                  {positionDate && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {positionDate}
                    </Typography>
                  )}
                </Box>
                <BacktestPositionsTable items={positions} loading={loadingPositions} />
              </Box>
            )}

            {/* Rebalance logs */}
            {tab === 'logs' && (
              <BacktestRebalanceLogTable items={rebalanceLogs} loading={loadingLogs} />
            )}

            {/* Config */}
            {tab === 'config' && (
              <CardContent sx={{ p: 3 }}>
                <BacktestConfigDrawer detail={detail} />
              </CardContent>
            )}
          </Card>
        </Box>
      )}
    </DashboardContent>
  );
}
