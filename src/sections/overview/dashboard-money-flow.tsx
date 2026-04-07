import type { MarketMoneyFlowDetail } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { fPctChg } from 'src/utils/format-number';

import { fetchMoneyFlow } from 'src/api/market';

// ----------------------------------------------------------------------

/** 元 → 亿元，null 返回 '-' */
function toYi(yuan: number | null): string {
  if (yuan == null) return '-';
  return `${(yuan / 100000000).toFixed(2)}亿`;
}

function flowColor(v: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (v == null) return 'text.secondary';
  if (v > 0) return 'error.main';
  if (v < 0) return 'success.main';
  return 'text.secondary';
}

type RowProps = { label: string; amount: number | null; rate: number | null };

function FlowRow({ label, amount, rate }: RowProps) {
  const color = flowColor(amount);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 0.75,
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 80 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight="fontWeightMedium" sx={{ color }}>
        {amount != null && amount > 0 ? '+' : ''}
        {toYi(amount)}
      </Typography>
      <Typography variant="caption" sx={{ color }}>
        {fPctChg(rate)}
      </Typography>
    </Box>
  );
}

// ----------------------------------------------------------------------

export function DashboardMoneyFlow() {
  const [data, setData] = useState<MarketMoneyFlowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchMoneyFlow()
      .then((res) => {
        if (!cancelled) setData(res ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载大盘资金流失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">资金流向</Typography>
          {data != null && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              净额（亿）
            </Typography>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="text" height={36} />
            ))}
          </>
        ) : data != null ? (
          <>
            {/* 主力净流入 高亮 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                px: 1.5,
                mb: 1,
                borderRadius: 1,
                bgcolor: (data.netAmount ?? 0) > 0 ? 'error.lighter' : 'success.lighter',
              }}
            >
              <Typography variant="body2" fontWeight="fontWeightBold">
                主力净流入
              </Typography>
              <Typography
                variant="h6"
                fontWeight="fontWeightBold"
                sx={{ color: flowColor(data.netAmount) }}
              >
                {data.netAmount != null && data.netAmount > 0 ? '+' : ''}
                {toYi(data.netAmount)}
              </Typography>
              <Typography variant="caption" sx={{ color: flowColor(data.netAmount) }}>
                {fPctChg(data.netAmountRate)}
              </Typography>
            </Box>

            <Divider sx={{ my: 1 }} />

            <FlowRow label="超大单" amount={data.buyElgAmount} rate={data.buyElgAmountRate} />
            <FlowRow label="大单" amount={data.buyLgAmount} rate={data.buyLgAmountRate} />
            <FlowRow label="中单" amount={data.buyMdAmount} rate={data.buyMdAmountRate} />
            <FlowRow label="小单（散户）" amount={data.buySmAmount} rate={data.buySmAmountRate} />
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>

      <Box sx={{ px: 2, pb: 2 }}>
        <Button
          component={RouterLink}
          href="/market/money-flow"
          size="small"
          fullWidth
          variant="outlined"
        >
          查看详情
        </Button>
      </Box>
    </Card>
  );
}
