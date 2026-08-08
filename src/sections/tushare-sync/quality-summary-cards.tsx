import type { QualityCheckSummary } from 'src/api/tushare-sync';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

type StatCardProps = {
  label: string;
  value: number | string;
  color?: string;
  subLabel?: string;
};

function StatCard({ label, value, color, subLabel }: StatCardProps) {
  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="h4" sx={{ color: color ?? 'text.primary', mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      {subLabel && (
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          {subLabel}
        </Typography>
      )}
    </Card>
  );
}

type Props = {
  summary: QualityCheckSummary | null;
  loading: boolean;
  showEmptyState?: boolean;
};

export function QualitySummaryCards({ summary, loading, showEmptyState = true }: Props) {
  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rounded" height={100} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!summary) {
    if (!showEmptyState) return null;
    return (
      <Card sx={{ mb: 3, p: 2.5 }}>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          暂无数据，请先触发质量检查
        </Typography>
      </Card>
    );
  }

  const failColor =
    summary.counts.fail > 5
      ? 'error.main'
      : summary.counts.fail > 0
        ? 'warning.main'
        : 'success.main';

  const crossTotal =
    summary.crossTableCounts.pass + summary.crossTableCounts.warn + summary.crossTableCounts.fail;
  const crossStatus =
    summary.crossTableCounts.fail > 0
      ? {
          label: `${summary.crossTableCounts.fail} 项失败`,
          color: 'error.main',
        }
      : summary.crossTableCounts.warn > 0
        ? {
            label: `${summary.crossTableCounts.warn} 项警告`,
            color: 'warning.main',
          }
        : { label: '全部通过', color: 'success.main' };

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard label="通过" value={summary.counts.pass} color="success.main" subLabel="数据集" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          label="警告"
          value={summary.counts.warn}
          color={summary.counts.warn > 0 ? 'warning.main' : 'text.primary'}
          subLabel="数据集"
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard label="失败" value={summary.counts.fail} color={failColor} subLabel="数据集" />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <StatCard
          label="跨表对账"
          value={`${crossTotal} 项已检查`}
          subLabel={crossStatus.label}
          color={crossStatus.color}
        />
      </Grid>
    </Grid>
  );
}

// Re-export for convenient access
export type { QualityCheckSummary };
