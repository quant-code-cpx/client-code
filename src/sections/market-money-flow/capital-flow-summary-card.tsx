import type { MarketMoneyFlowDetail } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fPctChg } from 'src/utils/format-number';

import { fetchMoneyFlow } from 'src/api/market';

// ----------------------------------------------------------------------

/** 万元 → 亿元，保留 2 位小数 */
function toYi(wan: number): string {
  return (wan / 10000).toFixed(2);
}

function flowColor(value: number): 'error.main' | 'success.main' | 'text.secondary' {
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

// ----------------------------------------------------------------------

type MetricBlockProps = {
  label: string;
  amount: number;
  rate: number;
  large?: boolean;
};

function MetricBlock({ label, amount, rate, large }: MetricBlockProps) {
  const color = flowColor(amount);

  return (
    <Box sx={{ textAlign: 'center', px: 1 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography
        variant={large ? 'h5' : 'h6'}
        fontWeight="fontWeightBold"
        sx={{ color, lineHeight: 1.2 }}
      >
        {amount > 0 ? '+' : ''}
        {toYi(amount)}亿
      </Typography>
      <Typography variant="caption" sx={{ color }}>
        {fPctChg(rate)}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
};

export function CapitalFlowSummaryCard({ tradeDate }: Props) {
  const [data, setData] = useState<MarketMoneyFlowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMoneyFlow({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : '加载大盘资金流数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          大盘资金流概要
        </Typography>

        {loading || !data ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: 5 }, (_, i) => i).map((k) => (
              <Box key={k} sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
                <Skeleton variant="text" width="80%" height={40} sx={{ mx: 'auto' }} />
                <Skeleton variant="text" width="40%" sx={{ mx: 'auto' }} />
              </Box>
            ))}
          </Box>
        ) : (
          <>
            <Grid container spacing={0} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12, sm: 'auto' }} sx={{ flex: 1 }}>
                <MetricBlock
                  label="总净流入"
                  amount={data.netAmount}
                  rate={data.netAmountRate}
                  large
                />
              </Grid>

              <Grid size="auto" sx={{ display: 'flex', alignItems: 'center' }}>
                <Divider orientation="vertical" flexItem />
              </Grid>

              <Grid size={{ xs: 12, sm: 'auto' }} sx={{ flex: 1 }}>
                <MetricBlock
                  label="超大单净流入"
                  amount={data.buyElgAmount}
                  rate={data.buyElgAmountRate}
                />
              </Grid>

              <Grid size="auto" sx={{ display: 'flex', alignItems: 'center' }}>
                <Divider orientation="vertical" flexItem />
              </Grid>

              <Grid size={{ xs: 12, sm: 'auto' }} sx={{ flex: 1 }}>
                <MetricBlock
                  label="大单净流入"
                  amount={data.buyLgAmount}
                  rate={data.buyLgAmountRate}
                />
              </Grid>

              <Grid size="auto" sx={{ display: 'flex', alignItems: 'center' }}>
                <Divider orientation="vertical" flexItem />
              </Grid>

              <Grid size={{ xs: 12, sm: 'auto' }} sx={{ flex: 1 }}>
                <MetricBlock
                  label="中单净流入"
                  amount={data.buyMdAmount}
                  rate={data.buyMdAmountRate}
                />
              </Grid>

              <Grid size="auto" sx={{ display: 'flex', alignItems: 'center' }}>
                <Divider orientation="vertical" flexItem />
              </Grid>

              <Grid size={{ xs: 12, sm: 'auto' }} sx={{ flex: 1 }}>
                <MetricBlock
                  label="小单净流入"
                  amount={data.buySmAmount}
                  rate={data.buySmAmountRate}
                />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                沪市&nbsp;
                <Box
                  component="span"
                  sx={{ color: flowColor(data.pctChangeSh), fontWeight: 'fontWeightMedium' }}
                >
                  {data.closeSh.toFixed(2)}
                </Box>
                &nbsp;
                <Box component="span" sx={{ color: flowColor(data.pctChangeSh) }}>
                  {fPctChg(data.pctChangeSh)}
                </Box>
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                深市&nbsp;
                <Box
                  component="span"
                  sx={{ color: flowColor(data.pctChangeSz), fontWeight: 'fontWeightMedium' }}
                >
                  {data.closeSz.toFixed(2)}
                </Box>
                &nbsp;
                <Box component="span" sx={{ color: flowColor(data.pctChangeSz) }}>
                  {fPctChg(data.pctChangeSz)}
                </Box>
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
