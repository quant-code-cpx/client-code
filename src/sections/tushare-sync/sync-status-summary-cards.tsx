import type { ReactNode } from 'react';
import type { DataOperationsOverview } from 'src/api/tushare-sync';
import type { IconifyName } from 'src/components/iconify/register-icons';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import {
  SYNC_RUNTIME_META,
  formatSyncDuration,
  resolveSyncDatasetLabel,
  formatSyncAttentionDetail,
  SYNC_FRESHNESS_STATUS_META,
  type SyncLogNavigationHandler,
} from './sync-status-overview-model';

type SyncStatusSummaryCardsProps = {
  overview: DataOperationsOverview;
  onGoLogs?: SyncLogNavigationHandler;
};

export function SyncStatusSummaryCards({ overview, onGoLogs }: SyncStatusSummaryCardsProps) {
  const runtimeMeta = SYNC_RUNTIME_META[overview.runtime.status];
  const activeTask = overview.runtime.activeTasks.at(-1);

  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, lg: 5 }}>
        <DecisionCard
          title="核心日频就绪度"
          icon="solar:chart-2-bold"
          tone={overview.coreReadiness.percentage === 100 ? 'success' : 'warning'}
        >
          <Stack direction="row" alignItems="baseline" spacing={1}>
            <Typography variant="h3" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {overview.coreReadiness.percentage}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {overview.coreReadiness.ready}/{overview.coreReadiness.total} 已到位
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={overview.coreReadiness.percentage}
            color={overview.coreReadiness.percentage === 100 ? 'success' : 'warning'}
            sx={{ my: 1.25, height: 6, borderRadius: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            以真实表内最大交易日对比最近已完成交易日，不再用同步时间代替新鲜度。
          </Typography>
        </DecisionCard>
      </Grid>

      <Grid size={{ xs: 12, md: 7, lg: 4 }}>
        <DecisionCard title="当前同步任务" icon={runtimeMeta.icon} tone={runtimeMeta.color}>
          <Box aria-live="polite">
            <Stack direction="row" alignItems="center" spacing={1}>
              <Label color={runtimeMeta.color} variant="soft">
                {runtimeMeta.label}
              </Label>
              {overview.runtime.runId ? (
                <Typography variant="caption" color="text.secondary" noWrap translate="no">
                  #{overview.runtime.runId.slice(0, 8)}
                </Typography>
              ) : null}
            </Stack>
            {overview.runtime.status === 'RUNNING' || overview.runtime.status === 'QUEUED' ? (
              <Box sx={{ mt: 1.25 }}>
                <Stack direction="row" justifyContent="space-between" spacing={1}>
                  <Typography variant="body2" noWrap>
                    {activeTask?.label ?? `等待执行 ${overview.runtime.totalTasks} 个任务`}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {overview.runtime.percentage}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={overview.runtime.percentage}
                  sx={{ mt: 0.75, height: 6, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  已完成 {overview.runtime.completedTasks}/{overview.runtime.totalTasks}
                  {overview.runtime.estimatedRemainingMs
                    ? ` · 预计剩余 ${formatSyncDuration(overview.runtime.estimatedRemainingMs)}`
                    : ''}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                没有同步任务占用执行队列。
              </Typography>
            )}
          </Box>
        </DecisionCard>
      </Grid>

      <Grid size={{ xs: 12, md: 5, lg: 3 }}>
        <DecisionCard
          title="需要关注"
          icon="solar:danger-triangle-bold"
          tone={overview.attention.length > 0 ? 'warning' : 'success'}
        >
          {overview.attention.length === 0 ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <Iconify
                aria-hidden="true"
                icon="solar:check-circle-bold"
                sx={{ color: 'success.main' }}
              />
              <Typography variant="body2">暂无高优先级异常</Typography>
            </Stack>
          ) : (
            <Stack spacing={0.75}>
              {overview.attention.map((item) => {
                const freshnessItem = overview.freshness.find(
                  (entry) => entry.dataset === item.dataset
                );
                const displayName = resolveSyncDatasetLabel(
                  item.dataset,
                  item.displayName ?? freshnessItem?.displayName
                );
                const statusMeta =
                  SYNC_FRESHNESS_STATUS_META[
                    item.type as keyof typeof SYNC_FRESHNESS_STATUS_META
                  ] ?? SYNC_FRESHNESS_STATUS_META.UNKNOWN;
                const lagTradingDays =
                  item.lagTradingDays ?? freshnessItem?.lagTradingDays ?? null;
                return (
                  <Button
                    key={item.dataset}
                    color="inherit"
                    size="small"
                    aria-label={`查看${displayName}同步日志`}
                    onClick={() => onGoLogs?.({ task: item.task })}
                    sx={{
                      px: 1.25,
                      py: 1,
                      width: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      borderRadius: 1,
                      alignItems: 'stretch',
                      justifyContent: 'flex-start',
                      bgcolor: 'background.neutral',
                    }}
                  >
                    <Box
                      sx={{
                        width: 3,
                        mr: 1,
                        flexShrink: 0,
                        borderRadius: 1,
                        bgcolor: item.severity === 'HIGH' ? 'error.main' : 'warning.main',
                      }}
                    />
                    <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={0.75}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                          {displayName}
                        </Typography>
                        <Label color={statusMeta.color} variant="soft">
                          {item.statusLabel ?? statusMeta.label}
                        </Label>
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ lineHeight: 1.45 }}
                      >
                        {formatSyncAttentionDetail(item.detail, lagTradingDays, freshnessItem)}
                      </Typography>
                      <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                        查看同步日志
                      </Typography>
                    </Stack>
                  </Button>
                );
              })}
            </Stack>
          )}
        </DecisionCard>
      </Grid>
    </Grid>
  );
}

function DecisionCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: IconifyName;
  tone: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        borderTopWidth: 3,
        borderTopColor: tone === 'default' ? 'divider' : `${tone}.main`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <Iconify
          aria-hidden="true"
          icon={icon}
          sx={{ color: tone === 'default' ? 'text.secondary' : `${tone}.main` }}
        />
        <Typography component="h3" variant="subtitle2">
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}
