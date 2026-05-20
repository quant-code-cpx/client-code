import type { MarketMoneyFlowDetail } from 'src/api/market';
import type { MoneyFlowTier } from 'src/components/money-flow-tiers';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { RouterLink } from 'src/routes/components';

import { fetchMoneyFlow } from 'src/api/market';

import { fmtNetYi, fmtFlowPct, MoneyFlowTierRows } from 'src/components/money-flow-tiers';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  showDetailLink?: boolean;
};

function netColor(v: number | null | undefined): 'error.main' | 'success.main' | 'text.secondary' {
  if (v == null) return 'text.secondary';
  if (v > 0) return 'error.main';
  if (v < 0) return 'success.main';
  return 'text.secondary';
}

export function MoneyFlowCard({ tradeDate, showDetailLink }: Props) {
  const theme = useTheme();
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
        if (!cancelled) setError(err instanceof Error ? err.message : '加载大盘资金流失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tradeDate]);

  const summaryColor = netColor(data?.netMfAmount);
  const netBgColor =
    (data?.netMfAmount ?? 0) > 0
      ? varAlpha(theme.vars.palette.error.mainChannel, 0.08)
      : varAlpha(theme.vars.palette.success.mainChannel, 0.08);

  const netMfRate =
    data?.netMfAmount != null && data?.totalAmount != null && data.totalAmount !== 0
      ? (data.netMfAmount / data.totalAmount) * 100
      : null;

  const tiers: MoneyFlowTier[] = data
    ? [
        {
          label: '超大单',
          netAmount: data.elg.netAmount,
          netRate: data.elg.netRate,
          buyAmount: data.elg.buyAmount,
          sellAmount: data.elg.sellAmount,
          buyRate: data.elg.buyRate,
          sellRate: data.elg.sellRate,
        },
        {
          label: '大单',
          netAmount: data.lg.netAmount,
          netRate: data.lg.netRate,
          buyAmount: data.lg.buyAmount,
          sellAmount: data.lg.sellAmount,
          buyRate: data.lg.buyRate,
          sellRate: data.lg.sellRate,
        },
        {
          label: '中单',
          netAmount: data.md.netAmount,
          netRate: data.md.netRate,
          buyAmount: data.md.buyAmount,
          sellAmount: data.md.sellAmount,
          buyRate: data.md.buyRate,
          sellRate: data.md.sellRate,
        },
        {
          label: '小单',
          netAmount: data.sm.netAmount,
          netRate: data.sm.netRate,
          buyAmount: data.sm.buyAmount,
          sellAmount: data.sm.sellAmount,
          buyRate: data.sm.buyRate,
          sellRate: data.sm.sellRate,
        },
      ]
    : [];

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}
        >
          <Typography variant="h6">资金流向</Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            净额（亿元）
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="text" height={36} />
            ))}
          </>
        ) : data != null ? (
          <>
            {/* 资金净流入汇总 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 1,
                px: 1.5,
                mb: 1,
                borderRadius: 1,
                bgcolor: netBgColor,
              }}
            >
              <Typography variant="body2" fontWeight="fontWeightBold">
                资金净流入（主动买卖口径）
              </Typography>
              <Typography variant="h6" fontWeight="fontWeightBold" sx={{ color: summaryColor }}>
                {fmtNetYi(data.netMfAmount)}
              </Typography>
              <Typography variant="caption" sx={{ color: summaryColor }}>
                {fmtFlowPct(netMfRate)}
              </Typography>
            </Box>

            {/* 各档位明细 */}
            <Divider sx={{ mb: 0.25 }} />
            <MoneyFlowTierRows tiers={tiers} />
          </>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            暂无数据
          </Typography>
        )}
      </CardContent>

      {showDetailLink && (
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
      )}
    </Card>
  );
}
