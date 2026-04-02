import type { IndexQuoteItem } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';

import { useRouter } from 'src/routes/hooks';

import { fPctChg, fQianYuan } from 'src/utils/format-number';

import { fetchIndexQuote } from 'src/api/market';

// ----------------------------------------------------------------------

const INDEX_NAME_MAP: Record<string, string> = {
  '000300.SH': '沪深300',
  '000905.SH': '中证500',
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
};

const INDEX_ORDER = ['000300.SH', '000905.SH', '000001.SH', '399001.SZ'];

// ----------------------------------------------------------------------

function IndexCard({ item }: { item: IndexQuoteItem }) {
  const router = useRouter();
  const name = INDEX_NAME_MAP[item.tsCode] ?? item.tsCode;
  const pct = item.pctChg ?? 0;

  let pctColor: 'error.main' | 'success.main' | 'text.secondary' = 'text.secondary';
  if (pct > 0) pctColor = 'error.main';
  else if (pct < 0) pctColor = 'success.main';

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea sx={{ height: '100%' }} onClick={() => router.push('/market/overview')}>
        <CardContent>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
            {name}
          </Typography>

          <Typography variant="h5" fontWeight="fontWeightBold" sx={{ mb: 0.5 }}>
            {item.close != null ? item.close.toFixed(2) : '-'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" fontWeight="fontWeightMedium" sx={{ color: pctColor }}>
              {item.pctChg != null ? fPctChg(item.pctChg) : '-'}
            </Typography>
            <Typography variant="caption" sx={{ color: pctColor }}>
              {item.change != null ? `${item.change > 0 ? '+' : ''}${item.change.toFixed(2)}` : '-'}
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
            成交额&nbsp;{item.amount != null ? fQianYuan(item.amount) : '-'}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function IndexCardSkeleton() {
  return (
    <Card sx={{ height: '100%' }}>
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

export function DashboardIndexCards() {
  const [data, setData] = useState<IndexQuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchIndexQuote()
      .then((res) => {
        if (!cancelled) setData(res ?? []);
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
  }, []);

  if (error) {
    return (
      <Grid size={12}>
        <Alert severity="error">{error}</Alert>
      </Grid>
    );
  }

  if (loading) {
    return (
      <>
        {INDEX_ORDER.map((code) => (
          <Grid key={code} size={{ xs: 12, sm: 6, md: 3 }}>
            <IndexCardSkeleton />
          </Grid>
        ))}
      </>
    );
  }

  const ordered = INDEX_ORDER.map((code) => data.find((d) => d.tsCode === code)).filter(
    Boolean
  ) as IndexQuoteItem[];

  return (
    <>
      {ordered.map((item) => (
        <Grid key={item.tsCode} size={{ xs: 12, sm: 6, md: 3 }}>
          <IndexCard item={item} />
        </Grid>
      ))}
    </>
  );
}
