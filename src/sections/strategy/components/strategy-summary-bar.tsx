import type { StrategySummary } from 'src/api/strategy';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { fRatioPercent } from 'src/utils/format-number';

import { getStrategySummary } from 'src/api/strategy';

import { getQuoteColor } from './quote-text';

// ----------------------------------------------------------------------

interface SummaryStat {
  label: string;
  value: string;
  color?: string;
}

export function StrategySummaryBar() {
  const [summary, setSummary] = useState<StrategySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getStrategySummary()
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch(() => {
        // summary failure is non-blocking
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid key={i} size={{ xs: 6, sm: 3 }}>
            <Skeleton variant="rounded" height={72} />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!summary) return null;

  const stats: SummaryStat[] = [
    { label: '策略总数', value: String(summary.totalCount) },
    { label: '已激活信号', value: String(summary.activeSignalCount) },
    { label: '近 7 日回测', value: String(summary.recent7dRunCount) },
    {
      label: '近 7 日最佳',
      value:
        summary.recent7dBestReturn != null
          ? `${summary.recent7dBestReturn >= 0 ? '+' : ''}${fRatioPercent(summary.recent7dBestReturn)}`
          : '—',
      color: summary.recent7dBestReturn != null ? 'best' : undefined,
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {stats.map((stat) => (
        <Grid key={stat.label} size={{ xs: 6, sm: 3 }}>
          <StatCard stat={stat} bestReturn={summary.recent7dBestReturn} />
        </Grid>
      ))}
    </Grid>
  );
}

// ----------------------------------------------------------------------

function StatCard({ stat, bestReturn }: { stat: SummaryStat; bestReturn: number | null }) {
  return (
    <Card sx={{ p: 2.5 }}>
      <Typography variant="overline" sx={{ color: 'text.disabled', fontSize: 12 }}>
        {stat.label}
      </Typography>
      <Typography
        variant="h4"
        sx={{
          mt: 0.5,
          fontFeatureSettings: '"tnum"',
          fontVariantNumeric: 'tabular-nums',
          color:
            stat.color === 'best' ? (theme) => getQuoteColor(bestReturn, theme) : 'text.primary',
        }}
      >
        {stat.value}
      </Typography>
    </Card>
  );
}
