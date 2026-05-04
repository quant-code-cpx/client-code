import type { Theme, SxProps } from '@mui/material/styles';

import Typography from '@mui/material/Typography';

import { fPercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------
// 行情数字组件：A 股惯例红涨绿跌，右对齐，等宽数字字体
// ----------------------------------------------------------------------

interface QuoteTextProps {
  value: number | null | undefined;
  format?: 'percent' | 'ratio';
  variant?: 'body2' | 'caption' | 'subtitle2' | 'h6';
  sx?: SxProps<Theme>;
}

/**
 * getQuoteColor — A 股惯例
 * 正值（涨）→ error.main（红）
 * 负值（跌）→ success.main（绿）
 * 零 / null → text.secondary
 */
export function getQuoteColor(
  value: number | null | undefined,
  theme: Theme
): string {
  if (value == null) return theme.palette.text.secondary;
  if (value > 0) return theme.palette.error.main;
  if (value < 0) return theme.palette.success.main;
  return theme.palette.text.secondary;
}

export function QuoteText({ value, format = 'percent', variant = 'body2', sx }: QuoteTextProps) {
  const formatted = value == null ? '—' : format === 'percent' ? fPercent(value) : String(value);
  const prefix = value != null && value > 0 ? '+' : '';

  return (
    <Typography
      variant={variant}
      sx={{
        fontFeatureSettings: '"tnum"',
        fontVariantNumeric: 'tabular-nums',
        textAlign: 'right',
        color: (theme) => getQuoteColor(value, theme),
        ...sx,
      }}
    >
      {value == null ? '—' : `${prefix}${formatted}`}
    </Typography>
  );
}
