import type { DataOperationsOverview } from 'src/api/tushare-sync';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';

import {
  resolveSyncLogStatus,
  EXACT_DATE_TIME_FORMAT,
  resolveRecentSyncTaskLabel,
  type SyncLogNavigationHandler,
} from './sync-status-overview-model';

type SyncStatusActivityCardsProps = {
  overview: DataOperationsOverview;
  onGoLogs?: SyncLogNavigationHandler;
  onGoQuality?: () => void;
};

export function SyncStatusActivityCards({
  overview,
  onGoLogs,
  onGoQuality,
}: SyncStatusActivityCardsProps) {
  const recentStatus = overview.recentRun
    ? resolveSyncLogStatus(overview.recentRun.status)
    : null;

  return (
    <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2">最近同步链路</Typography>
              <Typography variant="caption" color="text.secondary">
                从运行态恢复当前轮次，完成后保留最近任务结果。
              </Typography>
            </Box>
            <Button size="small" onClick={() => onGoLogs?.()}>
              查看全部日志
            </Button>
          </Stack>
          <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
            {overview.recentRun && recentStatus ? (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {resolveRecentSyncTaskLabel(overview.recentRun.task, overview.freshness)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {fDateTime(overview.recentRun.startedAt, EXACT_DATE_TIME_FORMAT)}
                  </Typography>
                </Box>
                <Label color={recentStatus.color} variant="soft">
                  {recentStatus.label}
                </Label>
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                暂无同步记录。
              </Typography>
            )}
          </Box>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, lg: 5 }}>
        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="subtitle2">质量与重试</Typography>
              <Typography variant="caption" color="text.secondary">
                质量失败和耗尽重试会抬升关注优先级。
              </Typography>
            </Box>
            <Button size="small" onClick={onGoQuality} disabled={!onGoQuality}>
              数据质量
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
            <Metric label="质量通过" value={overview.quality.pass} tone="success" />
            <Metric label="质量告警" value={overview.quality.warn} tone="warning" />
            <Metric label="质量失败" value={overview.quality.fail} tone="error" />
            <Metric
              label="待重试"
              value={overview.retryQueue.pending + overview.retryQueue.retrying}
              tone="info"
            />
            <Metric label="重试耗尽" value={overview.retryQueue.exhausted} tone="error" />
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Box sx={{ minWidth: 88, p: 1, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Typography variant="h6" color={`${tone}.main`} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
