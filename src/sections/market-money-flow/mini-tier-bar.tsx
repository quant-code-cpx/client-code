import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

type TierBarItem = {
  label: string;
  value: number | null;
};

type Props = {
  /** 超大单 */
  elg: number | null;
  /** 大单 */
  lg: number | null;
  /** 中单 */
  md: number | null;
  /** 小单 */
  sm: number | null;
  /** 单位说明，如 "亿" 或 "万元" */
  unit?: string;
  width?: number;
  height?: number;
};

/** 元 → 亿，保留 2 位 */
function toYi(v: number): string {
  return (v / 1e8).toFixed(2);
}

/**
 * 迷你四档资金堆叠条。
 * 仅展示净流入金额的相对占比，流入用红色系，流出用绿色系。
 * 四档按绝对值计算宽度比例。
 */
export function MiniTierBar({ elg, lg, md, sm, unit = '亿', width = 80, height = 6 }: Props) {
  const theme = useTheme();

  const tiers: TierBarItem[] = [
    { label: '超大单', value: elg },
    { label: '大单', value: lg },
    { label: '中单', value: md },
    { label: '小单', value: sm },
  ];

  const knownTiers = tiers.filter(
    (tier): tier is { label: string; value: number } => tier.value != null
  );
  const isComplete = knownTiers.length === tiers.length;
  const totalAbs = knownTiers.reduce((sum, tier) => sum + Math.abs(tier.value), 0);

  // Colors: inflow = error系 (deep→light), outflow = success系
  const inflowColors = [
    theme.palette.error.dark,
    theme.palette.error.main,
    theme.palette.error.light,
    varAlpha(theme.vars.palette.error.mainChannel, 0.4),
  ];
  const outflowColors = [
    theme.palette.success.dark,
    theme.palette.success.main,
    theme.palette.success.light,
    varAlpha(theme.vars.palette.success.mainChannel, 0.4),
  ];

  const tooltipContent = tiers
    .map((t) => {
      if (t.value == null) return `${t.label}: —`;
      const sign = t.value > 0 ? '+' : '';
      const val = unit === '亿' ? `${sign}${toYi(t.value)}亿` : `${sign}${t.value.toFixed(0)}万`;
      return `${t.label}: ${val}`;
    })
    .join('\n');

  return (
    <Tooltip
      title={<Box sx={{ whiteSpace: 'pre-line', fontSize: 12 }}>{tooltipContent}</Box>}
      placement="top"
    >
      <Box
        aria-label={`资金分层：${tooltipContent.replace(/\n/g, '；')}`}
        sx={{
          display: 'flex',
          width,
          height,
          borderRadius: 0.5,
          overflow: 'hidden',
          gap: '1px',
          bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
        }}
      >
        {isComplete && totalAbs > 0
          ? tiers.map((tier, i) => {
              if (tier.value == null) return null;
              const value = tier.value;
              const ratio = Math.abs(value) / totalAbs;
              const color = value >= 0 ? inflowColors[i] : outflowColors[i];
              return (
                <Box
                  key={tier.label}
                  sx={{
                    width: `${ratio * 100}%`,
                    height: '100%',
                    bgcolor: color,
                    minWidth: ratio > 0 ? 2 : 0,
                    flexShrink: 0,
                  }}
                />
              );
            })
          : null}
      </Box>
    </Tooltip>
  );
}
