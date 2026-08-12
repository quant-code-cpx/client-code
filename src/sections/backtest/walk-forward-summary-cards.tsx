import type { WalkForwardRunDetail } from 'src/api/backtest';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import {
  formatNumberValue,
  formatPercentValue,
  computeRobustnessStats,
} from './walk-forward-utils';

// ----------------------------------------------------------------------

type MetricCardProps = {
  label: string;
  value: string;
  color?: string;
};

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ color: color ?? 'text.primary', fontWeight: 700 }}>
        {value}
      </Typography>
    </Card>
  );
}

function pctColor(val: number | null): string | undefined {
  if (val === null || val === undefined) return undefined;
  return val > 0 ? 'error.main' : val < 0 ? 'success.main' : 'text.secondary';
}

// ----------------------------------------------------------------------

type Props = { detail: WalkForwardRunDetail };

export function WalkForwardSummaryCards({ detail }: Props) {
  const stats = computeRobustnessStats(detail);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
        <MetricCard
          label={stats.wfeEstimated ? 'WFE（估算）' : 'WFE'}
          value={formatPercentValue(stats.wfe, 1)}
          color={stats.wfe !== null && stats.wfe >= 0.7 ? 'success.main' : 'warning.main'}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
        <MetricCard
          label="OOS 年化收益"
          value={formatPercentValue(detail.oosAnnualizedReturn)}
          color={pctColor(detail.oosAnnualizedReturn)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
        <MetricCard
          label="OOS 夏普比率"
          value={formatNumberValue(detail.oosSharpeRatio, 3)}
          color={
            detail.oosSharpeRatio !== null
              ? detail.oosSharpeRatio >= 1
                ? 'success.main'
                : detail.oosSharpeRatio >= 0
                  ? 'warning.main'
                  : 'error.main'
              : undefined
          }
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
        <MetricCard
          label="OOS 最大回撤"
          value={formatPercentValue(detail.oosMaxDrawdown)}
          color={detail.oosMaxDrawdown !== null ? 'error.main' : undefined}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
        <MetricCard
          label="负 OOS 窗口占比"
          value={formatPercentValue(detail.oosNegativeWindowRate ?? stats.negativeWindowRate)}
          color={
            (detail.oosNegativeWindowRate ?? stats.negativeWindowRate ?? 1) <= 0.3
              ? 'success.main'
              : 'warning.main'
          }
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
        <MetricCard
          label="IS-OOS 衰减"
          value={formatPercentValue(stats.degradation)}
          color={
            stats.degradation !== null && stats.degradation <= 0.05
              ? 'success.main'
              : 'warning.main'
          }
        />
      </Grid>
    </Grid>
  );
}
