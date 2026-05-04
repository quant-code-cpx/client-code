import type { ReactNode } from 'react';
import type { BacktestRunListItem } from 'src/api/backtest';

import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { fPercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------

interface BacktestRunListKpiBarProps {
  items: BacktestRunListItem[];
  total: number;
  loading: boolean;
  onFailedReasonClick?: (code: string) => void;
}

type KpiTone = 'primary' | 'success' | 'secondary' | 'error';

function diffSeconds(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) return null;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) return null;
  return Math.round((endTime - startTime) / 1000);
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

function getDuration(item: BacktestRunListItem) {
  return (
    item.durationSeconds ??
    diffSeconds(item.startedAt ?? item.createdAt, item.completedAt) ??
    (item.status === 'RUNNING'
      ? diffSeconds(item.startedAt ?? item.createdAt, new Date().toISOString())
      : null)
  );
}

function KpiCard({
  tone,
  title,
  value,
  helper,
  children,
}: {
  tone: KpiTone;
  title: string;
  value: string;
  helper: string;
  children?: ReactNode;
}) {
  return (
    <Card
      sx={(theme) => ({
        height: '100%',
        borderLeft: 2,
        borderColor: `${tone}.main`,
        bgcolor: varAlpha(theme.vars.palette[tone].mainChannel, 0.04),
      })}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ mt: 0.5, fontFeatureSettings: '"tnum"' }}>
          {value}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {helper}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export function BacktestRunListKpiBar({
  items,
  total,
  loading,
  onFailedReasonClick,
}: BacktestRunListKpiBarProps) {
  const summary = useMemo(() => {
    const completed = items.filter((item) => item.status === 'COMPLETED').length;
    const running = items.filter((item) => item.status === 'RUNNING').length;
    const queued = items.filter((item) => item.status === 'QUEUED').length;
    const failed = items.filter((item) => item.status === 'FAILED').length;
    const durations = items.map(getDuration).filter((value): value is number => value != null);
    const avgDurationSeconds =
      durations.length > 0
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : null;
    const failedReasonMap = new Map<string, { label: string; count: number }>();

    items
      .filter((item) => item.status === 'FAILED')
      .forEach((item) => {
        const code =
          item.failedReasonCode ?? item.failedReasonLabel ?? item.failedReason ?? 'OTHER';
        const label = item.failedReasonLabel ?? item.failedReason ?? '其他失败';
        const current = failedReasonMap.get(code) ?? { label, count: 0 };
        failedReasonMap.set(code, { label: current.label, count: current.count + 1 });
      });

    return {
      completed,
      running,
      queued,
      failed,
      avgDurationSeconds,
      completionRate: items.length > 0 ? completed / items.length : 0,
      failedReasons: [...failedReasonMap.entries()]
        .map(([code, value]) => ({ code, ...value }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    };
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <Box
        sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' } }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={118} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' } }}>
      <KpiCard
        tone="primary"
        title="任务总数"
        value={`${total}`}
        helper="接口总数；聚合统计待后端 stats"
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          当前页 {items.length} 条
        </Typography>
      </KpiCard>

      <KpiCard
        tone="success"
        title="当前页完成率"
        value={fPercent(summary.completionRate)}
        helper={`完成 ${summary.completed} / 失败 ${summary.failed}`}
      >
        <LinearProgress
          variant="determinate"
          value={summary.completionRate * 100}
          sx={{ mt: 1, height: 4, borderRadius: 1 }}
        />
      </KpiCard>

      <KpiCard
        tone="secondary"
        title="平均耗时"
        value={formatDuration(summary.avgDurationSeconds)}
        helper={`运行中 ${summary.running} / 排队 ${summary.queued}`}
      />

      <KpiCard
        tone="error"
        title="失败原因 Top 3"
        value={`${summary.failed}`}
        helper="基于当前页聚合"
      >
        <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
          {summary.failedReasons.length > 0 ? (
            summary.failedReasons.map((reason) => (
              <Chip
                key={reason.code}
                size="small"
                color="error"
                variant="outlined"
                label={`${reason.label} ×${reason.count}`}
                onClick={() => onFailedReasonClick?.(reason.code)}
              />
            ))
          ) : (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              暂无失败聚类
            </Typography>
          )}
        </Stack>
      </KpiCard>
    </Box>
  );
}
