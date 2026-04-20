import type { HsgtTrendItem, MarketMoneyFlowDetail } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';

import { useRouter } from 'src/routes/hooks';

import { fetchHsgtFlow, fetchMoneyFlow } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

function flowColor(v: number): 'error.main' | 'success.main' {
  return v >= 0 ? 'error.main' : 'success.main';
}

// ----------------------------------------------------------------------

export function DashboardCapitalRadar() {
  const theme = useTheme();
  const router = useRouter();

  const [hsgt, setHsgt] = useState<HsgtTrendItem | null>(null);
  const [moneyFlow, setMoneyFlow] = useState<MarketMoneyFlowDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHsgt = fetchHsgtFlow({ days: 5 })
      .then((h) => {
        const hsgtData = h.history ?? [];
        setHsgt(hsgtData.length > 0 ? hsgtData[hsgtData.length - 1] : null);
      })
      .catch(() => {});

    const loadMoneyFlow = fetchMoneyFlow()
      .then((m) => setMoneyFlow(m))
      .catch(() => {});

    Promise.all([loadHsgt, loadMoneyFlow]).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Skeleton variant="rounded" height={260} />;
  }

  // ── Derived metrics ──────────────────────────────────────────────

  // 逐笔主力净流入（独立算法，元 → 亿元）
  const mfNet = moneyFlow?.netMfAmount ?? 0;
  const mfNetYi = mfNet / 1e8;
  const mfIsPos = mfNetYi >= 0;

  // 主力/散户汇总口径（按单量分层：超大+大单 vs 中+小单，元）
  const mainNet = moneyFlow?.main?.netAmount ?? 0;
  const retailNet = moneyFlow?.retail?.netAmount ?? 0;

  // 四层明细（元）
  const tiers = [
    { key: 'elg', label: '超大单', desc: '≥100万', tier: moneyFlow?.elg },
    { key: 'lg', label: '大单', desc: '20~100万', tier: moneyFlow?.lg },
    { key: 'md', label: '中单', desc: '4~20万', tier: moneyFlow?.md },
    { key: 'sm', label: '小单', desc: '<4万', tier: moneyFlow?.sm },
  ] as const;

  // 北向成交（百万元 → 亿元）
  const northAmount = hsgt?.northMoney != null ? hsgt.northMoney / 100 : null;

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title="资金雷达"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        avatar={<Iconify icon="solar:target-bold" width={22} sx={{ color: 'info.main' }} />}
        sx={{ pb: 0.5 }}
      />

      <Box sx={{ px: 3, pb: 2.5 }}>
        {/* ── Hero: 全市场净流入 ── */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
              全市场净流入
            </Typography>
            <Tooltip
              title="各股逐笔净流入（net_mf_amount）全市场汇总，独立算法估算；与下方「按单量分层」的买卖差汇总口径不同"
              arrow
            >
              <Box component="span" sx={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                <Iconify
                  icon="solar:question-circle-bold"
                  width={14}
                  sx={{ color: 'text.disabled' }}
                />
              </Box>
            </Tooltip>
          </Stack>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              color: flowColor(mfNetYi),
              lineHeight: 1.3,
            }}
          >
            {mfIsPos ? '+' : ''}
            {mfNetYi.toFixed(2)}
            <Typography
              component="span"
              variant="body2"
              sx={{ color: 'text.disabled', fontWeight: 500, ml: 0.5 }}
            >
              亿
            </Typography>
          </Typography>
        </Box>

        {/* ── 主力 vs 散户（按单量汇总口径） ── */}
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {[
            { label: '主力', desc: '超大+大单', val: mainNet },
            { label: '散户', desc: '中+小单', val: retailNet },
          ].map((g) => {
            const yi = g.val / 1e8;
            const isPos = yi >= 0;
            return (
              <Box
                key={g.label}
                sx={{
                  flex: 1,
                  p: 1.25,
                  borderRadius: 1.5,
                  bgcolor: varAlpha(
                    isPos
                      ? theme.vars.palette.error.mainChannel
                      : theme.vars.palette.success.mainChannel,
                    0.06
                  ),
                }}
              >
                <Tooltip title={g.desc} arrow>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', fontWeight: 600, cursor: 'help' }}
                  >
                    {g.label}
                  </Typography>
                </Tooltip>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: flowColor(yi), mt: 0.25 }}
                >
                  {isPos ? '+' : ''}
                  {yi.toFixed(2)}亿
                </Typography>
              </Box>
            );
          })}
        </Stack>

        <Divider sx={{ mb: 1.5 }} />

        {/* ── 四层明细（按单量分层：买卖量 + 比例条） ── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
            按单量分层
          </Typography>
          <Tooltip title="同一层内：买入额占比（红）vs 卖出额占比（绿）" arrow>
            <Box component="span" sx={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
              <Iconify
                icon="solar:question-circle-bold"
                width={13}
                sx={{ color: 'text.disabled' }}
              />
            </Box>
          </Tooltip>
        </Stack>

        <Stack spacing={1}>
          {tiers.map((t) => {
            const buy = t.tier?.buyAmount ?? 0;
            const sell = t.tier?.sellAmount ?? 0;
            const net = t.tier?.netAmount ?? 0;
            const sideTotal = buy + sell;
            const buyPct = sideTotal > 0 ? (buy / sideTotal) * 100 : 50;
            const buyYi = buy / 1e8;
            const sellYi = sell / 1e8;
            const netYi = net / 1e8;

            return (
              <Box key={t.key}>
                {/* Row 1: label + stacked bar + net */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.3 }}>
                  <Tooltip title={`单笔 ${t.desc}`} arrow>
                    <Typography
                      variant="caption"
                      sx={{
                        width: 42,
                        flexShrink: 0,
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'help',
                      }}
                    >
                      {t.label}
                    </Typography>
                  </Tooltip>

                  {/* Stacked buy/sell proportion bar */}
                  <Box
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      overflow: 'hidden',
                      display: 'flex',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${buyPct}%`,
                        bgcolor: 'error.main',
                        transition: 'width 0.4s ease',
                      }}
                    />
                    <Box
                      sx={{
                        flex: 1,
                        bgcolor: 'success.main',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </Box>

                  {/* Net value */}
                  <Typography
                    variant="caption"
                    sx={{
                      color: flowColor(netYi),
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                      minWidth: 52,
                      textAlign: 'right',
                    }}
                  >
                    {netYi >= 0 ? '+' : ''}
                    {netYi.toFixed(1)}亿
                  </Typography>
                </Stack>

                {/* Row 2: buy / sell amounts */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ pl: '50px', pr: '56px' }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: 'error.main', fontSize: 12, opacity: 0.65 }}
                  >
                    买{buyYi.toFixed(1)}亿
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'success.main', fontSize: 12, opacity: 0.65 }}
                  >
                    卖{sellYi.toFixed(1)}亿
                  </Typography>
                </Stack>
              </Box>
            );
          })}
        </Stack>

        {/* ── 北向成交（辅助信息） ── */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: `1px dashed ${varAlpha(theme.vars.palette.text.disabledChannel, 0.16)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Iconify icon="solar:chart-bold" width={14} sx={{ color: 'text.disabled' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              北向成交
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {northAmount != null ? `${northAmount.toFixed(1)}亿` : '—'}
          </Typography>
        </Stack>

        {/* View more link */}
        <Box sx={{ mt: 1.5, textAlign: 'center' }}>
          <Button size="small" variant="text" onClick={() => router.push('/market/money-flow')}>
            查看更多 →
          </Button>
        </Box>
      </Box>
    </Card>
  );
}
