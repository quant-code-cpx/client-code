import type { ComparisonGroupDetail, ComparisonEquitySeries } from 'src/api/backtest';

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
import { getComparisonDetail, getComparisonEquity } from 'src/api/backtest';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STATUS_COLOR, STATUS_LABEL } from '../constants';
import { useBacktestJob } from '../hooks/use-backtest-job';
import { ComparisonEquityChart } from '../comparison-equity-chart';
import { ComparisonMetricsTable } from '../comparison-metrics-table';

// ----------------------------------------------------------------------

export function ComparisonDetailView() {
  const { groupId } = useParams<{ groupId: string }>();

  const [detail, setDetail] = useState<ComparisonGroupDetail | null>(null);
  const [equitySeries, setEquitySeries] = useState<ComparisonEquitySeries[]>([]);
  const [jobId, setJobId] = useState<string | undefined>(undefined);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [loadingEquity, setLoadingEquity] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!groupId) return;
    setLoadingDetail(true);
    setError('');
    try {
      const d = await getComparisonDetail(groupId);
      setDetail(d);

      if (d.status === 'COMPLETED') {
        setLoadingEquity(true);
        try {
          const eq = await getComparisonEquity(groupId);
          setEquitySeries(eq.series ?? []);
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
  }, [groupId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Track jobId from the create response via router state
  useEffect(() => {
    const state = window.history.state?.usr as { jobId?: string } | undefined;
    if (state?.jobId) setJobId(state.jobId);
  }, []);

  useBacktestJob(jobId, {
    onProgress: () => {
      // no-op for comparison; just reload on complete
    },
    onCompleted: () => {
      loadDetail();
    },
    onFailed: () => {
      loadDetail();
    },
  });

  if (loadingDetail) {
    return (
      <DashboardContent>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={120} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </DashboardContent>
    );
  }

  if (error || !detail) {
    return (
      <DashboardContent>
        <Alert severity="error">{error || '对比任务不存在'}</Alert>
      </DashboardContent>
    );
  }

  const isRunning = detail.status === 'RUNNING' || detail.status === 'QUEUED';

  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Button
          component={RouterLink}
          href="/backtest"
          startIcon={<Iconify icon="solar:arrow-left-bold" width={18} />}
          variant="text"
          size="small"
          sx={{ mt: 0.5 }}
        >
          工作台
        </Button>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h5">{detail.name || '未命名策略对比'}</Typography>
            <Label color={STATUS_COLOR[detail.status] ?? 'default'}>
              {STATUS_LABEL[detail.status] ?? detail.status}
            </Label>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {detail.startDate} ~ {detail.endDate} · 基准: {detail.benchmarkTsCode}
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

      {/* Progress */}
      {isRunning && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" icon={<Iconify icon="solar:loading-bold" width={20} />}>
            策略对比正在运行中，请等待…
          </Alert>
          <LinearProgress sx={{ mt: 1 }} />
        </Box>
      )}

      {detail.status === 'FAILED' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          对比任务执行失败
        </Alert>
      )}

      {/* Equity chart */}
      {detail.status === 'COMPLETED' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              净值曲线对比
            </Typography>
            {loadingEquity ? (
              <Skeleton variant="rounded" height={320} />
            ) : (
              <ComparisonEquityChart series={equitySeries} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Metrics table */}
      {detail.status === 'COMPLETED' && detail.metrics && detail.metrics.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              指标对比 (最优值高亮)
            </Typography>
            <ComparisonMetricsTable rows={detail.metrics} />
          </CardContent>
        </Card>
      )}
    </DashboardContent>
  );
}
