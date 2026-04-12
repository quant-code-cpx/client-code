import type { SignalActivationItem, SignalHistoryResponse } from 'src/api/signal';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Typography from '@mui/material/Typography';

import { DashboardContent } from 'src/layouts/dashboard';
import { getSignalHistory, listSignalActivations } from 'src/api/signal';

import { SignalEmptyState } from '../signal-empty-state';
import { SignalHistoryGroup } from '../signal-history-group';

// ----------------------------------------------------------------------

export function SignalHistoryView() {
  const [activations, setActivations] = useState<SignalActivationItem[]>([]);
  const [loadingActivations, setLoadingActivations] = useState(true);

  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [history, setHistory] = useState<SignalHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Fetch activations for dropdown
  useEffect(() => {
    (async () => {
      setLoadingActivations(true);
      try {
        const data = await listSignalActivations();
        setActivations(data);
        if (data.length > 0) {
          const firstActive = data.find((a) => a.isActive) ?? data[0];
          setSelectedStrategyId(firstActive.strategyId);
        }
      } catch {
        // silently fail - activations dropdown just stays empty
      } finally {
        setLoadingActivations(false);
      }
    })();
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!selectedStrategyId) return;
    setLoadingHistory(true);
    setHistoryError('');
    try {
      const data = await getSignalHistory({
        strategyId: selectedStrategyId,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        page,
        pageSize,
      });
      setHistory(data);
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : '获取信号历史失败');
    } finally {
      setLoadingHistory(false);
    }
  }, [selectedStrategyId, startDate, endDate, page, pageSize]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearch = () => {
    setPage(1);
    fetchHistory();
  };

  const totalPages = history ? Math.ceil(history.total / pageSize) : 0;
  const currentActivation = activations.find((a) => a.strategyId === selectedStrategyId);

  return (
    <DashboardContent>
      <Typography variant="h4" sx={{ mb: 3 }}>
        信号历史
      </Typography>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <TextField
          select
          size="small"
          label="策略选择"
          value={selectedStrategyId}
          onChange={(e) => {
            setSelectedStrategyId(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 200 }}
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
          label="起始日期（YYYYMMDD）"
          placeholder="如 20260401"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          sx={{ width: 180 }}
        />

        <TextField
          size="small"
          label="截止日期（YYYYMMDD）"
          placeholder="如 20260411"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          sx={{ width: 180 }}
        />

        <Button variant="contained" onClick={handleSearch} disabled={!selectedStrategyId}>
          查询
        </Button>
      </Box>

      {/* Empty — no activations */}
      {!loadingActivations && activations.length === 0 && <SignalEmptyState />}

      {/* Error */}
      {historyError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {historyError}
        </Alert>
      )}

      {/* Loading */}
      {loadingHistory && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton height={32} width={200} />
          <Skeleton variant="rounded" height={200} />
          <Skeleton variant="rounded" height={200} />
        </Box>
      )}

      {/* History groups */}
      {!loadingHistory && history && (
        <>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            策略：{currentActivation?.strategyName ?? selectedStrategyId} · 共 {history.total}{' '}
            条记录
          </Typography>

          {history.groups.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
              该日期范围内无信号记录
            </Typography>
          ) : (
            <Card variant="outlined">
              {history.groups.map((group, index) => (
                <Box key={group.tradeDate}>
                  {index > 0 && <Divider />}
                  <Box sx={{ p: 2 }}>
                    <SignalHistoryGroup group={group} />
                  </Box>
                </Box>
              ))}
            </Card>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </DashboardContent>
  );
}
