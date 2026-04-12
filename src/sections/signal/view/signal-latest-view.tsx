import type { LatestSignalResponse, SignalActivationItem } from 'src/api/signal';

import { useSearchParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import { getLatestSignals, listSignalActivations } from 'src/api/signal';

import { SignalEmptyState } from '../signal-empty-state';
import { SignalDetailPanel } from '../signal-detail-panel';
import { SignalActivationCard } from '../signal-activation-card';

// ----------------------------------------------------------------------

export function SignalLatestView() {
  const [searchParams] = useSearchParams();
  const queryStrategyId = searchParams.get('strategyId');

  const [activations, setActivations] = useState<SignalActivationItem[]>([]);
  const [loadingActivations, setLoadingActivations] = useState(true);
  const [activationsError, setActivationsError] = useState('');

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [tradeDate, setTradeDate] = useState('');

  const [latestSignals, setLatestSignals] = useState<LatestSignalResponse | null>(null);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [signalsError, setSignalsError] = useState('');

  // Fetch activations
  const fetchActivations = useCallback(async () => {
    setLoadingActivations(true);
    setActivationsError('');
    try {
      const data = await listSignalActivations();
      setActivations(data);

      // Auto-select from query param or first active strategy
      if (data.length > 0) {
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
  }, [queryStrategyId]);

  useEffect(() => {
    fetchActivations();
  }, [fetchActivations]);

  // Fetch latest signals
  const fetchLatestSignals = useCallback(async () => {
    if (!selectedStrategyId) return;
    setLoadingSignals(true);
    setSignalsError('');
    try {
      const data = await getLatestSignals({
        strategyId: selectedStrategyId,
        ...(tradeDate ? { tradeDate } : {}),
      });
      setLatestSignals(data.length > 0 ? data[0] : null);
    } catch (err: unknown) {
      setSignalsError(err instanceof Error ? err.message : '获取最新信号失败');
    } finally {
      setLoadingSignals(false);
    }
  }, [selectedStrategyId, tradeDate]);

  useEffect(() => {
    fetchLatestSignals();
  }, [fetchLatestSignals]);

  const formatDate = (dateStr: string) => {
    if (dateStr.length === 8) {
      return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4">策略信号</Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            size="small"
            label="策略筛选"
            value={selectedStrategyId}
            onChange={(e) => setSelectedStrategyId(e.target.value)}
            sx={{ minWidth: 180 }}
            disabled={loadingActivations}
          >
            {activations.map((a) => (
              <MenuItem key={a.strategyId} value={a.strategyId}>
                {a.strategyName}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            label="交易日（YYYYMMDD）"
            placeholder="如 20260411"
            value={tradeDate}
            onChange={(e) => setTradeDate(e.target.value)}
            sx={{ width: 180 }}
          />
        </Box>
      </Box>

      {/* Activation error */}
      {activationsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {activationsError}
        </Alert>
      )}

      {/* Loading activations */}
      {loadingActivations && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!loadingActivations && !activationsError && activations.length === 0 && <SignalEmptyState />}

      {/* Activation cards */}
      {!loadingActivations && activations.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {activations.map((a) => (
              <Grid key={a.strategyId} size={{ xs: 12, sm: 6, md: 4 }}>
                <SignalActivationCard
                  activation={a}
                  selected={a.strategyId === selectedStrategyId}
                  onClick={() => setSelectedStrategyId(a.strategyId)}
                />
              </Grid>
            ))}
          </Grid>

          {/* Signal detail area */}
          {signalsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {signalsError}
            </Alert>
          )}

          {loadingSignals && (
            <Box>
              <Skeleton height={40} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" height={200} />
            </Box>
          )}

          {!loadingSignals && !signalsError && latestSignals && (
            <Box>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="subtitle1">策略：{latestSignals.strategyName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  · 交易日：{formatDate(latestSignals.tradeDate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  · 生成于 {new Date(latestSignals.generatedAt).toLocaleTimeString('zh-CN')}
                </Typography>
              </Box>

              <SignalDetailPanel signals={latestSignals.signals} />
            </Box>
          )}

          {!loadingSignals && !signalsError && !latestSignals && selectedStrategyId && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              该交易日无信号数据
            </Typography>
          )}
        </>
      )}
    </DashboardContent>
  );
}
