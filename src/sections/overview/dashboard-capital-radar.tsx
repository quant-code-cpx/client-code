import type { HsgtTrendItem, MainFlowRankingItem, MarketMoneyFlowDetail } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { useRouter } from 'src/routes/hooks';

import { fetchHsgtFlow, fetchMoneyFlow, fetchMainFlowRanking } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function DashboardCapitalRadar() {
  const theme = useTheme();
  const router = useRouter();

  const [hsgt, setHsgt] = useState<HsgtTrendItem | null>(null);
  const [moneyFlow, setMoneyFlow] = useState<MarketMoneyFlowDetail | null>(null);
  const [topStocks, setTopStocks] = useState<MainFlowRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchHsgtFlow({ days: 1 }),
      fetchMoneyFlow(),
      fetchMainFlowRanking({ limit: 3, order: 'desc' }),
    ])
      .then(([h, m, r]) => {
        const hsgtData = h.history ?? [];
        setHsgt(hsgtData.length > 0 ? hsgtData[hsgtData.length - 1] : null);
        setMoneyFlow(m);
        setTopStocks(r.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton variant="rounded" height={260} />;
  }

  // HSGT: northMoney in 百万元 → 亿元
  const northNet = hsgt?.northMoney != null ? hsgt.northMoney / 100 : null;
  const northIsPositive = (northNet ?? 0) >= 0;

  // Main force: netMfAmount in 元 → 亿元
  const mainNet = moneyFlow?.netMfAmount != null ? moneyFlow.netMfAmount / 1e8 : null;
  const mainIsPositive = (mainNet ?? 0) >= 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="资金雷达"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        avatar={<Iconify icon="solar:target-bold" width={22} sx={{ color: 'info.main' }} />}
        sx={{ pb: 1 }}
      />

      <Box sx={{ px: 3, pb: 2.5 }}>
        {/* HSGT hero metric */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: varAlpha(
              northIsPositive
                ? theme.vars.palette.error.mainChannel
                : theme.vars.palette.success.mainChannel,
              0.08
            ),
            mb: 2,
          }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            北向资金净流入
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mt: 0.25 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: northIsPositive ? 'error.main' : 'success.main',
              }}
            >
              {northNet != null ? `${northIsPositive ? '+' : ''}${northNet.toFixed(2)}` : '—'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              亿元
            </Typography>
          </Stack>
        </Box>

        {/* Main force net */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            主力净流入
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: mainIsPositive ? 'error.main' : 'success.main',
            }}
          >
            {mainNet != null ? `${mainIsPositive ? '+' : ''}${mainNet.toFixed(2)}亿` : '—'}
          </Typography>
        </Stack>

        <Divider sx={{ mb: 1.5 }} />

        {/* Top 3 main-force stocks */}
        <Typography
          variant="caption"
          sx={{ color: 'text.disabled', fontWeight: 600, mb: 1, display: 'block' }}
        >
          主力净流入 TOP 3
        </Typography>
        <Stack spacing={0.75}>
          {topStocks.map((stock, idx) => {
            const netInflow = stock.mainNetInflow / 10000; // 万元→亿元
            const isPos = netInflow >= 0;
            return (
              <Stack
                key={stock.tsCode}
                direction="row"
                alignItems="center"
                spacing={1}
                onClick={() => router.push(`/stock/${stock.tsCode}`)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  transition: 'background-color 0.15s',
                  '&:hover': {
                    bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.04),
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 10,
                    bgcolor:
                      idx === 0
                        ? 'error.main'
                        : idx === 1
                          ? 'warning.main'
                          : varAlpha(theme.vars.palette.text.disabledChannel, 0.2),
                    color: idx < 2 ? '#fff' : 'text.secondary',
                  }}
                >
                  {idx + 1}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, fontSize: 13 }}>
                  {stock.name ?? stock.tsCode}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: isPos ? 'error.main' : 'success.main', fontWeight: 700 }}
                >
                  {isPos ? '+' : ''}
                  {netInflow.toFixed(2)}亿
                </Typography>
              </Stack>
            );
          })}
        </Stack>

        {/* View more link */}
        <Typography
          variant="caption"
          onClick={() => router.push('/market/money-flow')}
          sx={{
            mt: 1.5,
            display: 'block',
            textAlign: 'center',
            color: 'text.disabled',
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
        >
          查看更多 →
        </Typography>
      </Box>
    </Card>
  );
}
