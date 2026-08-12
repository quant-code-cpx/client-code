import type { IconifyProps } from 'src/components/iconify';
import type {
  WalkForwardWindow,
  WalkForwardRunDetail,
  WalkForwardEquityPoint,
} from 'src/api/backtest';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  cancelWalkForwardRun,
  getWalkForwardEquity,
  getWalkForwardRunDetail,
} from 'src/api/backtest';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useBacktestJob } from '../hooks/use-backtest-job';
import { WalkForwardConfigRecap } from '../walk-forward-config-recap';
import { WalkForwardEquityChart } from '../walk-forward-equity-chart';
import { WalkForwardWindowTable } from '../walk-forward-window-table';
import { WalkForwardWindowDrawer } from '../walk-forward-window-drawer';
import { WalkForwardProgressCard } from '../walk-forward-progress-card';
import { WalkForwardSummaryCards } from '../walk-forward-summary-cards';
import { WalkForwardRobustnessPanel } from '../walk-forward-robustness-panel';
import { robustnessColor, robustnessLabel, computeRobustnessStats } from '../walk-forward-utils';
import {
  STATUS_COLOR,
  STATUS_LABEL,
  STRATEGY_TYPE_LABEL,
  OPTIMIZE_METRIC_OPTIONS,
} from '../constants';

import type { BacktestProgressEvent } from '../hooks/use-backtest-job';

// ----------------------------------------------------------------------

type DetailTab = 'overview' | 'robustness' | 'windows' | 'config';

const DETAIL_TABS: Array<{ value: DetailTab; label: string; icon: IconifyProps['icon'] }> = [
  { value: 'overview', label: '总览', icon: 'solar:chart-2-bold' },
  { value: 'robustness', label: '稳健性', icon: 'solar:shield-check-bold' },
  { value: 'windows', label: '窗口明细', icon: 'solar:list-bold' },
  { value: 'config', label: '配置复盘', icon: 'solar:settings-bold-duotone' },
];

function resolveTab(value: string | null): DetailTab {
  return DETAIL_TABS.some((tab) => tab.value === value) ? (value as DetailTab) : 'overview';
}

export function WalkForwardDetailView() {
  const { wfRunId } = useParams<{ wfRunId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [detail, setDetail] = useState<WalkForwardRunDetail | null>(null);
  const [equity, setEquity] = useState<WalkForwardEquityPoint[]>([]);
  const [progressEvent, setProgressEvent] = useState<BacktestProgressEvent | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<WalkForwardWindow | null>(null);
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
      } else {
        setEquity([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, [wfRunId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useBacktestJob(detail?.jobId, {
    onProgress: (evt) => {
      setProgressEvent(evt);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              progress: evt.progress,
              completedWindows: evt.completedWindows ?? prev.completedWindows,
              windowCount: evt.windowCount ?? prev.windowCount,
            }
          : prev
      );
    },
    onCompleted: () => {
      void loadDetail();
    },
    onFailed: (evt) => {
      setDetail((prev) => (prev ? { ...prev, status: 'FAILED', failedReason: evt.reason } : prev));
    },
  });

  const handleCancel = useCallback(async () => {
    if (!wfRunId) return;
    setError('');
    try {
      await cancelWalkForwardRun(wfRunId);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消接口待后端支持，前端已保留操作入口');
    }
  }, [loadDetail, wfRunId]);

  if (loadingDetail) {
    return (
      <DashboardContent>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={280} />
      </DashboardContent>
    );
  }

  if (!detail) {
    return (
      <DashboardContent>
        <Alert severity="error">{error || '任务不存在'}</Alert>
      </DashboardContent>
    );
  }

  const optimizeLabel =
    OPTIMIZE_METRIC_OPTIONS.find((o) => o.value === detail.optimizeMetric)?.label ??
    detail.optimizeMetric;
  const activeTab = resolveTab(searchParams.get('tab'));
  const robustnessStats = computeRobustnessStats(detail);
  const isActiveRun = detail.status === 'RUNNING' || detail.status === 'QUEUED';

  const handleTabChange = (_: unknown, next: DetailTab) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  };

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
            <Label color={robustnessColor(robustnessStats.level)}>
              {robustnessLabel(robustnessStats.level)}
            </Label>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {STRATEGY_TYPE_LABEL[detail.baseStrategyType] ?? detail.baseStrategyType} ·{' '}
            {detail.fullStartDate} ~ {detail.fullEndDate} · IS {detail.inSampleDays}天 / OOS{' '}
            {detail.outOfSampleDays}天 · 优化: {optimizeLabel}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexShrink: 0 }}>
          {isActiveRun && (
            <Button
              color="warning"
              variant="outlined"
              size="small"
              startIcon={<Iconify icon="solar:stop-circle-bold" width={16} />}
              onClick={() => {
                void handleCancel();
              }}
            >
              取消
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
            onClick={() => {
              void loadDetail();
            }}
          >
            刷新
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Progress for running */}
      {isActiveRun && (
        <Box sx={{ mb: 3 }}>
          <WalkForwardProgressCard detail={detail} progressEvent={progressEvent} />
        </Box>
      )}

      {detail.status === 'FAILED' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {detail.failedReason || '任务执行失败'}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="walk forward detail tabs"
          onChange={handleTabChange}
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {DETAIL_TABS.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={<Iconify icon={tab.icon} width={18} />}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Card>

      {activeTab === 'overview' && (
        <Stack spacing={3}>
          <WalkForwardSummaryCards detail={detail} />
          <Card>
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
        </Stack>
      )}

      {activeTab === 'robustness' && <WalkForwardRobustnessPanel detail={detail} />}

      {activeTab === 'windows' && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              窗口汇总 ({detail.windows.length} 个)
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              点击窗口可查看已返回的汇总指标；窗口级净值、成交、持仓与调仓钻取尚未开放。
            </Alert>
            <WalkForwardWindowTable windows={detail.windows} onWindowClick={setSelectedWindow} />
          </CardContent>
        </Card>
      )}

      {activeTab === 'config' && <WalkForwardConfigRecap detail={detail} />}

      {wfRunId && (
        <WalkForwardWindowDrawer
          open={Boolean(selectedWindow)}
          windowItem={selectedWindow}
          onClose={() => setSelectedWindow(null)}
        />
      )}
    </DashboardContent>
  );
}
