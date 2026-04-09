import type { WalkForwardRunDetail, WalkForwardEquityPoint } from 'src/api/backtest';

import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { getWalkForwardEquity, getWalkForwardRunDetail } from 'src/api/backtest';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useBacktestJob } from '../hooks/use-backtest-job';
import { WalkForwardEquityChart } from '../walk-forward-equity-chart';
import { WalkForwardWindowTable } from '../walk-forward-window-table';
import { WalkForwardSummaryCards } from '../walk-forward-summary-cards';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  STRATEGY_TYPE_LABEL,
  OPTIMIZE_METRIC_OPTIONS,
} from '../constants';

// ----------------------------------------------------------------------

export function WalkForwardDetailView() {
  const { wfRunId } = useParams<{ wfRunId: string }>();

  const [detail, setDetail] = useState<WalkForwardRunDetail | null>(null);
  const [equity, setEquity] = useState<WalkForwardEquityPoint[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingEquity, setLoadingEquity] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!wfRunId) return;
    setLoadingDetail(true);
    setError('');
    try {
      const d = await getWalkForwardRunDetail(wfRunId);
      setDetail(d);

      if (d.status === 'COMPLETED') {
        setLoadingEquity(true);
        try {
          const eq = await getWalkForwardEquity(wfRunId);
          setEquity(eq.points ?? []);
        } catch {
          // equity not ready
        } finally {
          setLoadingEquity(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, [wfRunId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useBacktestJob(detail?.jobId, {
    onProgress: (evt) => {
      setDetail((prev) => (prev ? { ...prev, progress: evt.progress } : prev));
    },
    onCompleted: () => {
      loadDetail();
    },
    onFailed: (evt) => {
      setDetail((prev) => (prev ? { ...prev, status: 'FAILED', failedReason: evt.reason } : prev));
    },
  });

  if (loadingDetail) {
    return (
      <DashboardContent>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={280} />
      </DashboardContent>
    );
  }

  if (error || !detail) {
    return (
      <DashboardContent>
        <Alert severity="error">{error || '任务不存在'}</Alert>
      </DashboardContent>
    );
  }

  const optimizeLabel =
    OPTIMIZE_METRIC_OPTIONS.find((o) => o.value === detail.optimizeMetric)?.label ??
    detail.optimizeMetric;

  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Button
          component={RouterLink}
          href="/backtest/walk-forward"
          startIcon={<Iconify icon="solar:arrow-left-bold" width={18} />}
          variant="text"
          size="small"
          sx={{ mt: 0.5 }}
        >
          列表
        </Button>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5">{detail.name || '未命名 WF 任务'}</Typography>
            <Label color={STATUS_COLOR[detail.status] ?? 'default'}>
              {STATUS_LABEL[detail.status] ?? detail.status}
            </Label>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {STRATEGY_TYPE_LABEL[detail.baseStrategyType] ?? detail.baseStrategyType} ·{' '}
            {detail.fullStartDate} ~ {detail.fullEndDate} · IS {detail.inSampleDays}天 / OOS{' '}
            {detail.outOfSampleDays}天 · 优化: {optimizeLabel}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
          onClick={loadDetail}
          sx={{ mt: 0.5, flexShrink: 0 }}
        >
          刷新
        </Button>
      </Box>

      {/* Progress for running */}
      {(detail.status === 'RUNNING' || detail.status === 'QUEUED') && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" icon={<Iconify icon="solar:loading-bold" width={20} />}>
            {detail.status === 'QUEUED'
              ? '任务等待中…'
              : `正在运行 Walk-Forward… 已完成 ${detail.completedWindows ?? 0} / ${detail.windowCount ?? '?'} 个窗口`}
          </Alert>
          <LinearProgress variant="determinate" value={detail.progress} sx={{ mt: 1 }} />
        </Box>
      )}

      {detail.status === 'FAILED' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {detail.failedReason || '任务执行失败'}
        </Alert>
      )}

      {/* Summary cards — completed only */}
      {detail.status === 'COMPLETED' && (
        <Box sx={{ mb: 3 }}>
          <WalkForwardSummaryCards detail={detail} />
        </Box>
      )}

      {/* OOS equity chart */}
      {detail.status === 'COMPLETED' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              OOS 净值曲线
            </Typography>
            {loadingEquity ? (
              <Skeleton variant="rounded" height={280} />
            ) : (
              <WalkForwardEquityChart points={equity} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Window table */}
      {detail.windows && detail.windows.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              窗口详情 ({detail.windows.length} 个)
            </Typography>
            <WalkForwardWindowTable windows={detail.windows} />
          </CardContent>
        </Card>
      )}
    </DashboardContent>
  );
}
