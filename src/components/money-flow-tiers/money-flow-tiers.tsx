import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

/** 元 → 亿（整数，取绝对值） */
function grossYi(yuan: number | null | undefined): number {
  if (yuan == null) return 0;
  return Math.abs(yuan / 1e8);
}

/** 元 → 亿（带正负号显示） */
export function fmtNetYi(yuan: number | null | undefined): string {
  if (yuan == null) return '—';
  const v = yuan / 1e8;
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}亿`;
}

/** 百分比（带正负号） */
export function fmtFlowPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

// ----------------------------------------------------------------------

export type MoneyFlowTier = {
  /** 显示标签，如"超大单" */
  label: string;
  /** 净流入额（元）正=流入，负=流出 */
  netAmount: number | null;
  /** 净流入 / 全市场总成交（%） */
  netRate: number | null;
  /** 买方成交额（元，按订单规模分类） */
  buyAmount: number | null;
  /** 卖方成交额（元，按订单规模分类） */
  sellAmount: number | null;
  /** 买入额 / 全市场总成交（%），可选 */
  buyRate?: number | null;
  /** 卖出额 / 全市场总成交（%），可选 */
  sellRate?: number | null;
};

// ----------------------------------------------------------------------

type TierItemProps = {
  tier: MoneyFlowTier;
};

function TierItem({ tier }: TierItemProps) {
  const theme = useTheme();

  const net = tier.netAmount != null ? tier.netAmount / 1e8 : 0;
  const isPositive = net > 0;
  // A-share: red = inflow (bullish), green = outflow (bearish)
  const netColor = isPositive ? theme.palette.error.main : theme.palette.success.main;

  const b = grossYi(tier.buyAmount);
  const s = grossYi(tier.sellAmount);
  const total = b + s;
  const buyPct = total > 0 ? (b / total) * 100 : 50;

  // Use tier-level rate if provided, else compute from abs ratio
  const buyRatePct = tier.buyRate != null ? tier.buyRate : total > 0 ? (b / total) * 50 : null;
  const sellRatePct = tier.sellRate != null ? tier.sellRate : total > 0 ? (s / total) * 50 : null;

  return (
    <Box sx={{ py: 0.9 }}>
      {/* ── Row 1: label | net rate% | net amount ── */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.6 }}>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 700, width: 52, flexShrink: 0 }}
        >
          {tier.label}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.disabled', mr: 0.5 }}>
          {fmtFlowPct(tier.netRate)}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: netColor, fontWeight: 700, minWidth: 72, textAlign: 'right' }}
        >
          {fmtNetYi(tier.netAmount)}
        </Typography>
      </Box>

      {/* ── Row 2: buy amount (rate%) | bar | sell amount (rate%) ── */}
      {total > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* Buy side — right-aligned, red */}
          <Box sx={{ width: 70, textAlign: 'right', flexShrink: 0 }}>
            <Typography
              component="span"
              variant="caption"
              sx={{ color: theme.palette.error.light, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
            >
              买 {b.toFixed(0)}亿
            </Typography>
            {buyRatePct != null && (
              <Typography
                component="span"
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: 12, ml: 0.3 }}
              >
                ({buyRatePct.toFixed(1)}%)
              </Typography>
            )}
          </Box>

          {/* Buy vs sell proportion bar */}
          <Box
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              bgcolor: varAlpha(theme.vars.palette.success.mainChannel, 0.15),
            }}
          >
            <Box
              sx={{
                width: `${buyPct.toFixed(1)}%`,
                height: '100%',
                bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.65),
                borderRadius: 'inherit',
              }}
            />
          </Box>

          {/* Sell side — left-aligned, green */}
          <Box sx={{ width: 70, flexShrink: 0 }}>
            <Typography
              component="span"
              variant="caption"
              sx={{ color: theme.palette.success.light, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}
            >
              卖 {s.toFixed(0)}亿
            </Typography>
            {sellRatePct != null && (
              <Typography
                component="span"
                variant="caption"
                sx={{ color: 'text.disabled', fontSize: 12, ml: 0.3 }}
              >
                ({sellRatePct.toFixed(1)}%)
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ----------------------------------------------------------------------

export type MoneyFlowTierRowsProps = {
  tiers: MoneyFlowTier[];
  /** 在档位之间显示分隔线，默认 true */
  dividers?: boolean;
};

export function MoneyFlowTierRows({ tiers, dividers = true }: MoneyFlowTierRowsProps) {
  return (
    <Box>
      {tiers.map((tier, i) => (
        <Box key={tier.label}>
          {dividers && i > 0 && <Divider sx={{ opacity: 0.4 }} />}
          <TierItem tier={tier} />
        </Box>
      ))}
    </Box>
  );
}
