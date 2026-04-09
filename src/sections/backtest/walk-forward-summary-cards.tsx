import type { WalkForwardRunDetail } from 'src/api/backtest';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

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

function pctStr(val: number | null): string {
  if (val === null || val === undefined) return '—';
  return `${val >= 0 ? '+' : ''}${(val * 100).toFixed(2)}%`;
}

function pctColor(val: number | null): string | undefined {
  if (val === null || val === undefined) return undefined;
  return val >= 0 ? 'success.main' : 'error.main';
}

// ----------------------------------------------------------------------

type Props = { detail: WalkForwardRunDetail };

export function WalkForwardSummaryCards({ detail }: Props) {
  const isOosCompareLabel =
    detail.isOosReturnVsIs !== null
      ? `${detail.isOosReturnVsIs >= 0 ? '+' : ''}${(detail.isOosReturnVsIs * 100).toFixed(2)}%`
      : '—';

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard
          label="OOS 年化收益"
          value={pctStr(detail.oosAnnualizedReturn)}
          color={pctColor(detail.oosAnnualizedReturn)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard
          label="OOS 夏普比率"
          value={detail.oosSharpeRatio !== null ? detail.oosSharpeRatio.toFixed(3) : '—'}
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
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard
          label="OOS 最大回撤"
          value={pctStr(detail.oosMaxDrawdown)}
          color={detail.oosMaxDrawdown !== null ? 'error.main' : undefined}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <MetricCard
          label="IS vs OOS 收益差"
          value={isOosCompareLabel}
          color={pctColor(detail.isOosReturnVsIs)}
        />
      </Grid>
    </Grid>
  );
}
