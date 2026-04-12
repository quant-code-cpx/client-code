import type { IndexQuoteItem } from 'src/api/market';
import type { IndexInfo } from 'src/api/index-detail';

import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fPctChg, fQianYuan } from 'src/utils/format-number';

import { fetchIndexQuote } from 'src/api/market';

// ----------------------------------------------------------------------

type MetricCardProps = {
  label: string;
  value: string;
  color?: string;
};

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color: color ?? 'text.primary' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="70%" height={36} />
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tsCode: string;
  indexInfo: IndexInfo | null;
};

export function IndexOverviewCard({ tsCode, indexInfo }: Props) {
  const [quote, setQuote] = useState<IndexQuoteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexQuote({ ts_codes: [tsCode] })
      .then((res) => {
        if (!cancelled) setQuote(res?.[0] ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载指数行情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tsCode]);

  if (error) return <Alert severity="error">{error}</Alert>;

  const pct = quote?.pctChg ?? 0;
  const chg = quote?.change ?? 0;
  const pctColor = pct > 0 ? 'error.main' : pct < 0 ? 'success.main' : 'text.secondary';
  const chgColor = chg > 0 ? 'error.main' : chg < 0 ? 'success.main' : 'text.secondary';

  const skeletonKeys = [0, 1, 2, 3, 4, 5];

  return (
    <Grid container spacing={2}>
      {loading ? (
        skeletonKeys.map((k) => (
          <Grid key={k} size={{ xs: 6, sm: 4, md: 2 }}>
            <MetricSkeleton />
          </Grid>
        ))
      ) : (
        <>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <MetricCard
              label="最新点位"
              value={quote?.close != null ? quote.close.toFixed(2) : '-'}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <MetricCard label="涨跌幅" value={fPctChg(quote?.pctChg)} color={pctColor} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <MetricCard
              label="涨跌额"
              value={
                quote?.change != null
                  ? `${quote.change > 0 ? '+' : ''}${quote.change.toFixed(2)}`
                  : '-'
              }
              color={chgColor}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <MetricCard label="成交额" value={fQianYuan(quote?.amount)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <MetricCard label="基期" value={indexInfo?.baseDate ?? '-'} color="text.secondary" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <MetricCard
              label="基点"
              value={indexInfo?.basePoint != null ? String(indexInfo.basePoint) : '-'}
              color="text.secondary"
            />
          </Grid>
        </>
      )}
    </Grid>
  );
}
