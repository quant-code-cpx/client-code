import type { IconifyProps } from 'src/components/iconify';
import type { IndexQuoteItem, MarketMoneyFlowDetail } from 'src/api/market';

import { useState, useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fPctChg } from 'src/utils/format-number';

import { fetchMoneyFlow, fetchIndexQuote } from 'src/api/market';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** 元 → 亿元，保留 2 位小数 */
function toYi(yuan: number | null): string {
  if (yuan == null) return '-';
  return (yuan / 100000000).toFixed(2);
}

function flowColor(value: number | null): 'error.main' | 'success.main' | 'text.secondary' {
  if (value == null) return 'text.secondary';
  if (value > 0) return 'error.main';
  if (value < 0) return 'success.main';
  return 'text.secondary';
}

function flowPalette(value: number | null): 'error' | 'success' | 'grey' {
  if (value == null) return 'grey';
  if (value > 0) return 'error';
  if (value < 0) return 'success';
  return 'grey';
}

// ----------------------------------------------------------------------

type MetricCardProps = {
  label: string;
  amount: number | null;
  rate: number | null;
  icon: IconifyProps['icon'];
  hero?: boolean;
  /** 问号图标悬停时展示的补充说明（主要用于解释 + - 百分比含义） */
  hint?: string;
};

function MetricCard({ label, amount, rate, icon, hero, hint }: MetricCardProps) {
  const theme = useTheme();
  const color = flowColor(amount);
  const palette = flowPalette(amount);
  const bgChannel =
    palette === 'grey'
      ? theme.vars.palette.text.secondaryChannel
      : theme.vars.palette[palette].mainChannel;

  const inner = (
    <Box
      sx={{
        p: hero ? 2.5 : 2,
        borderRadius: 2,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: varAlpha(bgChannel, 0.06),
        border: `1px solid`,
        borderColor: varAlpha(bgChannel, 0.12),
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          bgcolor: varAlpha(bgChannel, 0.1),
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 16px 0 ${varAlpha(bgChannel, 0.16)}`,
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        <Iconify icon={icon} width={16} sx={{ color, opacity: 0.72, flexShrink: 0 }} />
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 'fontWeightMedium',
            fontSize: '0.875rem',
            lineHeight: 1,
          }}
        >
          {label}
        </Typography>
        {hint && (
          <Tooltip placement="top" title={hint}>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                ml: 'auto',
                flexShrink: 0,
                cursor: 'help',
                width: 14,
                height: 14,
                borderRadius: '50%',
                bgcolor: 'text.disabled',
                color: 'background.paper',
                fontSize: '9px',
                fontWeight: 700,
                lineHeight: '14px',
                userSelect: 'none',
              }}
            >
              ?
            </Box>
          </Tooltip>
        )}
      </Stack>

      <Typography
        variant={hero ? 'h4' : 'h6'}
        fontWeight="fontWeightBold"
        sx={{ color, lineHeight: 1.2, mb: 0.5 }}
      >
        {amount != null && amount > 0 ? '+' : ''}
        {toYi(amount)}
        <Typography
          component="span"
          variant={hero ? 'body1' : 'body2'}
          sx={{ color, ml: 0.5, fontWeight: 'fontWeightMedium' }}
        >
          亿
        </Typography>
      </Typography>

      <Typography variant="caption" sx={{ color, opacity: 0.8 }}>
        {fPctChg(rate)}
      </Typography>
    </Box>
  );

  return inner;
}

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  /** 后端解析出的实际 tradeDate，用于默认回填页面日期选择器 */
  onTradeDateResolved?: (tradeDate: string) => void;
  /** 数据加载完成后的回调，可用于 PulseHeadline 等展示 */
  onDataResolved?: (data: MarketMoneyFlowDetail) => void;
};

/** 同时展示的主要广基指数（上证 / 深证 / 创业板 / 科创50） */
const INDEX_CODES = ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH'] as const;
const INDEX_NAMES: Record<string, string> = {
  '000001.SH': '上证指数',
  '399001.SZ': '深证成指',
  '399006.SZ': '创业板指',
  '000688.SH': '科创50',
};

const NET_RATE_HINT =
  '净流入率 = 该档位净流入金额 ÷ 全市场单边总成交额。\n正值表示主动买入资金占成交比重（主动占优），\n负值表示主动卖出资金占成交比重。\n该指标可判断该档位资金在全市场中的主导强度。';
const HERO_RATE_HINT =
  '逐笔资金净流入 = 全市场每只股票（主动买入 － 主动卖出）的累加。\n与主力资金不同，它不区分资金大小，\n反映全市场所有逐笔成交的主动买卖方向合力。\n下方百分比 = 逐笔净流入 ÷ 全市场单边总成交额，\n衡量全市场主动买卖的净偏向强度。';

export function CapitalFlowSummaryCard({ tradeDate, onTradeDateResolved, onDataResolved }: Props) {
  const theme = useTheme();
  const [data, setData] = useState<MarketMoneyFlowDetail | null>(null);
  const [indices, setIndices] = useState<IndexQuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      fetchMoneyFlow({ trade_date: tradeDate }),
      fetchIndexQuote({ trade_date: tradeDate, ts_codes: [...INDEX_CODES] }),
    ])
      .then(([flowRes, indexRes]) => {
        if (cancelled) return;
        setData(flowRes ?? null);
        setIndices(indexRes ?? []);
        if (flowRes?.tradeDate) onTradeDateResolved?.(flowRes.tradeDate);
        if (flowRes) onDataResolved?.(flowRes);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载大盘资金流数据失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // onTradeDateResolved 是父级 useCallback 稳定引用，省略依赖避免重复请求
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeDate]);

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Card
      sx={{
        p: 3,
        background: `linear-gradient(135deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.02)} 0%, ${varAlpha(theme.vars.palette.background.neutralChannel, 0.02)} 100%)`,
      }}
    >
      {loading || !data ? (
        <Grid container spacing={2}>
          {Array.from({ length: 5 }, (_, i) => i).map((k) => (
            <Grid key={k} size={{ xs: 6, sm: 4, md: k === 0 ? 4 : 2 }}>
              <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <MetricCard
                label="逐笔资金净流入"
                amount={data.netMfAmount}
                rate={
                  data.netMfAmount != null && data.totalAmount != null && data.totalAmount !== 0
                    ? (data.netMfAmount / data.totalAmount) * 100
                    : null
                }
                icon="solar:wallet-bold"
                hero
                hint={HERO_RATE_HINT}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="超大单"
                amount={data.elg.netAmount}
                rate={data.elg.netRate}
                icon="solar:star-bold"
                hint={NET_RATE_HINT}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="大单"
                amount={data.lg.netAmount}
                rate={data.lg.netRate}
                icon="solar:graph-up-bold"
                hint={NET_RATE_HINT}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="中单"
                amount={data.md.netAmount}
                rate={data.md.netRate}
                icon="solar:filter-bold"
                hint={NET_RATE_HINT}
              />
            </Grid>

            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <MetricCard
                label="小单"
                amount={data.sm.netAmount}
                rate={data.sm.netRate}
                icon="solar:alt-arrow-down-bold"
                hint={NET_RATE_HINT}
              />
            </Grid>
          </Grid>

          {/* 主要广基指数行：上证 / 深证 / 创业板 / 科创50 */}
          <Stack
            direction="row"
            spacing={{ xs: 1.5, sm: 3 }}
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
            sx={{
              mt: 2,
              pt: 2,
              borderTop: `1px dashed`,
              borderColor: varAlpha(theme.vars.palette.grey['500Channel'], 0.2),
            }}
          >
            {INDEX_CODES.map((code) => {
              const item = indices.find((it) => it.tsCode === code);
              return (
                <Stack key={code} direction="row" alignItems="center" spacing={1}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {INDEX_NAMES[code]}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: flowColor(item?.pctChg ?? null),
                      fontWeight: 'fontWeightBold',
                    }}
                  >
                    {item?.close != null ? item.close.toFixed(2) : '-'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: flowColor(item?.pctChg ?? null) }}>
                    {fPctChg(item?.pctChg ?? null)}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </>
      )}
    </Card>
  );
}
