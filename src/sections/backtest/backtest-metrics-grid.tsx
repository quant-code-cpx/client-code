import type { BacktestRunDetailResponse } from 'src/api/backtest';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fPercent, fNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string | null;
  color?: string;
}

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: color ?? 'text.primary' }}
        >
          {value ?? '-'}
        </Typography>
      </CardContent>
    </Card>
  );
}

function pctVal(v: number | null): string | null {
  if (v == null) return null;
  return `${v >= 0 ? '+' : ''}${fPercent(v)}`;
}

function pctColor(v: number | null, invert?: boolean): string | undefined {
  if (v == null) return undefined;
  if (invert) return v < 0 ? 'success.main' : 'error.main';
  return v >= 0 ? 'error.main' : 'success.main';
}

// ----------------------------------------------------------------------

interface BacktestMetricsGridProps {
  summary: BacktestRunDetailResponse['summary'];
}

export function BacktestMetricsGrid({ summary }: BacktestMetricsGridProps) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="总收益"
          value={pctVal(summary.totalReturn)}
          color={pctColor(summary.totalReturn)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="年化收益"
          value={pctVal(summary.annualizedReturn)}
          color={pctColor(summary.annualizedReturn)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="基准收益"
          value={pctVal(summary.benchmarkReturn)}
          color={pctColor(summary.benchmarkReturn)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="超额收益"
          value={pctVal(summary.excessReturn)}
          color={pctColor(summary.excessReturn)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="最大回撤"
          value={pctVal(summary.maxDrawdown)}
          color={pctColor(summary.maxDrawdown, true)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="夏普比率"
          value={summary.sharpeRatio != null ? summary.sharpeRatio.toFixed(2) : null}
          color={
            summary.sharpeRatio != null
              ? summary.sharpeRatio >= 1
                ? 'success.main'
                : summary.sharpeRatio >= 0
                  ? 'text.primary'
                  : 'error.main'
              : undefined
          }
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="年化波动率"
          value={pctVal(summary.volatility)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="胜率"
          value={pctVal(summary.winRate)}
          color={pctColor(summary.winRate)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="换手率（年化）"
          value={pctVal(summary.turnoverRate)}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="交易笔数"
          value={summary.tradeCount != null ? fNumber(summary.tradeCount) : null}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="索提诺比率"
          value={summary.sortinoRatio != null ? summary.sortinoRatio.toFixed(2) : null}
        />
      </Grid>
      <Grid size={{ xs: 6, sm: 4, md: 2 }}>
        <MetricCard
          label="信息比率"
          value={summary.informationRatio != null ? summary.informationRatio.toFixed(2) : null}
        />
      </Grid>
    </Grid>
  );
}
