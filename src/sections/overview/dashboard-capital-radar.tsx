import type { HsgtTrendItem, MarketMoneyFlowDetail } from 'src/api/market';

import { varAlpha } from 'minimal-shared/utils';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
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

function flowColor(v: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (v == null) return 'text.secondary';
  return v >= 0 ? 'error.main' : 'success.main';
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

// ----------------------------------------------------------------------

type DashboardCapitalRadarProps = { refreshKey?: number };

export function DashboardCapitalRadar({ refreshKey }: DashboardCapitalRadarProps) {
  const theme = useTheme();
  const router = useRouter();

  const [hsgt, setHsgt] = useState<HsgtTrendItem | null>(null);
  const [moneyFlow, setMoneyFlow] = useState<MarketMoneyFlowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({ hsgt: '', moneyFlow: '' });
  const requestRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setErrors({ hsgt: '', moneyFlow: '' });

    const [hsgtResult, moneyFlowResult] = await Promise.allSettled([
      fetchHsgtFlow({ days: 5 }),
      fetchMoneyFlow(),
    ]);
    if (requestRef.current !== requestId) return;

    const nextErrors = { hsgt: '', moneyFlow: '' };
    if (hsgtResult.status === 'fulfilled') {
      const history = hsgtResult.value.history ?? [];
      setHsgt(history.length > 0 ? history[history.length - 1] : null);
    } else {
      nextErrors.hsgt = errorMessage(hsgtResult.reason, '北向成交数据加载失败');
    }

    if (moneyFlowResult.status === 'fulfilled') {
      setMoneyFlow(moneyFlowResult.value);
    } else {
      nextErrors.moneyFlow = errorMessage(moneyFlowResult.reason, '市场资金流数据加载失败');
    }

    setErrors(nextErrors);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
    return () => {
      requestRef.current += 1;
    };
  }, [fetchData, refreshKey]);

  if (loading && !hsgt && !moneyFlow) {
    return <Skeleton variant="rounded" height={260} />;
  }

  // ── Derived metrics ──────────────────────────────────────────────

  // 逐笔资金净流入（独立算法，元 → 亿元）
  const mfNet = moneyFlow?.netMfAmount ?? null;
  const mfNetYi = mfNet == null ? null : mfNet / 1e8;
  const mfIsPos = mfNetYi != null && mfNetYi >= 0;

  // 主力汇总口径（超大+大单，元）
  const mainNet = moneyFlow?.main?.netAmount ?? null;

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
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="资金雷达"
        slotProps={{ title: { variant: 'subtitle1', fontWeight: 700 } }}
        avatar={<Iconify icon="solar:target-bold" width={22} sx={{ color: 'info.main' }} />}
        sx={{ pb: 0.5 }}
      />

      <Box sx={{ px: 3, pb: 2.5, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {(errors.moneyFlow || errors.hsgt) && (
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={() => void fetchData()}>
                重试
              </Button>
            }
            sx={{ mb: 1.5 }}
          >
            {[
              errors.moneyFlow
                ? `${moneyFlow ? '资金流刷新失败，当前展示上次数据：' : ''}${errors.moneyFlow}`
                : '',
              errors.hsgt
                ? `${hsgt ? '北向成交刷新失败，当前展示上次数据：' : ''}${errors.hsgt}`
                : '',
            ]
              .filter(Boolean)
              .join('；')}
          </Alert>
        )}

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
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'help',
                  color: 'text.disabled',
                  flexShrink: 0,
                }}
              >
                <Iconify icon="solar:info-circle-bold" width={15} />
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
            {mfNetYi == null ? '—' : `${mfIsPos ? '+' : ''}${mfNetYi.toFixed(2)}`}
            <Typography
              component="span"
              variant="body2"
              sx={{ color: 'text.disabled', fontWeight: 500, ml: 0.5 }}
            >
              {mfNetYi == null ? '' : '亿'}
            </Typography>
          </Typography>
        </Box>

        {/* ── 主力净流入（超大+大单；散户方向必然相反，不重复展示） ── */}
        {(() => {
          const yi = mainNet == null ? null : mainNet / 1e8;
          const isPos = yi != null && yi >= 0;
          return (
            <Box
              sx={{
                p: 1.25,
                mb: 2,
                borderRadius: 1.5,
                bgcolor:
                  yi == null
                    ? 'background.neutral'
                    : varAlpha(
                        isPos
                          ? theme.vars.palette.error.mainChannel
                          : theme.vars.palette.success.mainChannel,
                        0.06
                      ),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Tooltip
                title="超大单（≥100万）+ 大单（20~100万）净流入；散户方向与主力相反，数值互为镜像"
                arrow
              >
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', fontWeight: 600, cursor: 'help' }}
                >
                  主力净流入
                </Typography>
              </Tooltip>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: flowColor(yi) }}>
                {yi == null ? '—' : `${isPos ? '+' : ''}${yi.toFixed(2)}亿`}
              </Typography>
            </Box>
          );
        })()}

        <Divider sx={{ mb: 1.5 }} />

        {/* ── 四层明细（按单量分层：买卖量 + 比例条） ── */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600 }}>
            按单量分层
          </Typography>
          <Tooltip title="同一层内：买入额占比（红）vs 卖出额占比（绿）" arrow>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'help',
                color: 'text.disabled',
                flexShrink: 0,
              }}
            >
              <Iconify icon="solar:info-circle-bold" width={14} />
            </Box>
          </Tooltip>
        </Stack>

        <Stack sx={{ flex: 1, justifyContent: 'space-evenly' }}>
          {tiers.map((t) => {
            const buy = t.tier?.buyAmount ?? null;
            const sell = t.tier?.sellAmount ?? null;
            const net = t.tier?.netAmount ?? null;
            const sideTotal = buy != null && sell != null ? buy + sell : null;
            const buyPct =
              buy != null && sideTotal != null && sideTotal > 0 ? (buy / sideTotal) * 100 : null;
            const buyYi = buy == null ? null : buy / 1e8;
            const sellYi = sell == null ? null : sell / 1e8;
            const netYi = net == null ? null : net / 1e8;

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
                        width: buyPct == null ? '100%' : `${buyPct}%`,
                        bgcolor: buyPct == null ? 'action.disabledBackground' : 'error.main',
                        transition: 'width 0.4s ease',
                      }}
                    />
                    {buyPct != null && (
                      <Box
                        sx={{
                          flex: 1,
                          bgcolor: 'success.main',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    )}
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
                    {netYi == null ? '—' : `${netYi >= 0 ? '+' : ''}${netYi.toFixed(1)}亿`}
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
                    买{buyYi == null ? '—' : `${buyYi.toFixed(1)}亿`}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'success.main', fontSize: 12, opacity: 0.65 }}
                  >
                    卖{sellYi == null ? '—' : `${sellYi.toFixed(1)}亿`}
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
            mt: 0,
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
