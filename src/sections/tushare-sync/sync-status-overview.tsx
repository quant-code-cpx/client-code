import type { DataOperationsOverview } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { fDateTime } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { SyncFreshnessTable } from './sync-freshness-table';
import { SyncStatusSummaryCards } from './sync-status-summary-cards';
import { SyncStatusActivityCards } from './sync-status-activity-cards';
import {
  formatSyncTradeDate,
  EXACT_DATE_TIME_FORMAT,
  type SyncLogNavigationHandler,
} from './sync-status-overview-model';

type Props = {
  refreshKey?: number;
  onGoLogs?: SyncLogNavigationHandler;
  onGoQuality?: () => void;
};

export function SyncStatusOverviewPanel({ refreshKey = 0, onGoLogs, onGoQuality }: Props) {
  const [overview, setOverview] = useState<DataOperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    setError('');
    try {
      setOverview(await tushareSyncApi.getOperationsOverview());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '获取数据运维概览失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void fetchOverview();
  }, [fetchOverview, refreshKey]);

  useEffect(() => {
    if (overview?.runtime.status !== 'RUNNING' && overview?.runtime.status !== 'QUEUED') {
      return undefined;
    }
    const timer = window.setInterval(fetchOverview, 5000);
    return () => window.clearInterval(timer);
  }, [fetchOverview, overview?.runtime.status]);

  if (loading && !overview) return <OverviewSkeleton />;

  if (!overview) {
    return (
      <Alert
        severity="error"
        sx={{ mt: 3 }}
        action={
          <Button color="inherit" size="small" onClick={fetchOverview}>
            重试
          </Button>
        }
      >
        {error || '暂无数据运维概览'}
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 3, pb: 3 }}>
      {loading ? <LinearProgress aria-label="运行概览更新中" sx={{ mb: 1.5 }} /> : null}
      {error ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {error}，当前展示上次成功快照。
        </Alert>
      ) : null}

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography component="h2" variant="h6" sx={{ textWrap: 'balance' }}>
            数据运行概览
          </Typography>
          <Typography variant="body2" color="text.secondary">
            优先判断核心日频数据是否可用，再处理正在执行的任务与异常。
          </Typography>
        </Box>
        <Tooltip title={`快照生成于 ${fDateTime(overview.generatedAt, EXACT_DATE_TIME_FORMAT)}`}>
          <Typography variant="caption" color="text.secondary">
            应到交易日 {formatSyncTradeDate(overview.expectedTradeDate)}
          </Typography>
        </Tooltip>
      </Stack>

      <SyncStatusSummaryCards overview={overview} onGoLogs={onGoLogs} />
      <SyncFreshnessTable freshness={overview.freshness} onGoLogs={onGoLogs} />
      <SyncStatusActivityCards
        overview={overview}
        onGoLogs={onGoLogs}
        onGoQuality={onGoQuality}
      />
    </Box>
  );
}

function OverviewSkeleton() {
  return (
    <Box sx={{ mt: 3 }}>
      <Grid container spacing={1.5}>
        {[5, 4, 3].map((size) => (
          <Grid key={size} size={{ xs: 12, lg: size }}>
            <Skeleton variant="rounded" height={180} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={360} sx={{ mt: 1.5 }} />
    </Box>
  );
}
