import type { IndexQuoteItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fPctChg, fQianYuan } from 'src/utils/format-number';

import { fetchIndexQuote } from 'src/api/market';

// ----------------------------------------------------------------------

const INDEX_NAME_MAP: Record<string, string> = {
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
  '399006.SZ': '创业板指',
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000852.SH': '中证1000',
};

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

function IndexCard({ item }: { item: IndexQuoteItem }) {
  const name = INDEX_NAME_MAP[item.tsCode] ?? item.tsCode;
  const pct = item.pctChg ?? 0;

  let pctColor: 'error.main' | 'success.main' | 'text.secondary' = 'text.secondary';
  if (pct > 0) pctColor = 'error.main';
  else if (pct < 0) pctColor = 'success.main';

  return (
    <Card>
      <CardContent>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
          {name}
        </Typography>

        <Typography variant="h5" fontWeight="fontWeightBold" sx={{ mb: 0.5 }}>
          {item.close != null ? item.close.toFixed(2) : '-'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight="fontWeightMedium" sx={{ color: pctColor }}>
            {item.pctChg != null ? fPctChg(item.pctChg) : '-'}
          </Typography>
          <Typography variant="caption" sx={{ color: pctColor }}>
            {item.change != null
              ? `${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}`
              : '-'}
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
          成交额&nbsp;{item.amount != null ? fQianYuan(item.amount) : '-'}
        </Typography>
      </CardContent>
    </Card>
  );
}

function IndexCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Skeleton variant="text" width="50%" />
        <Skeleton variant="text" width="60%" height={40} />
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="55%" />
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

export function MarketIndexCards({ tradeDate }: Props) {
  const [data, setData] = useState<IndexQuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexQuote({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载指数行情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  if (error) {
    return (
      <Grid size={12}>
        <Alert severity="error">{error}</Alert>
      </Grid>
    );
  }

  const skeletonKeys = Array.from({ length: 6 }, (_, i) => i);

  return (
    <>
      {loading
        ? skeletonKeys.map((k) => (
            <Grid key={k} size={{ xs: 6, sm: 4, md: 2 }}>
              <IndexCardSkeleton />
            </Grid>
          ))
        : data.map((item) => (
            <Grid key={item.tsCode} size={{ xs: 6, sm: 4, md: 2 }}>
              <IndexCard item={item} />
            </Grid>
          ))}
    </>
  );
}
