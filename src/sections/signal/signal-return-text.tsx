import type { Theme, SxProps } from '@mui/material/styles';

import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fPercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  value: number | null | undefined;
  variant?: 'body2' | 'caption' | 'subtitle2';
  sx?: SxProps<Theme>;
};

export function getSignalReturnColor(value: number | null | undefined, theme: Theme) {
  if (value === null || value === undefined || value === 0) return theme.palette.text.secondary;
  return value > 0 ? theme.palette.error.main : theme.palette.success.main;
}

export function SignalReturnText({ value, variant = 'body2', sx }: Props) {
  const theme = useTheme();

  const text = value === null || value === undefined ? '—' : `${value > 0 ? '+' : ''}${fPercent(value)}`;

  return (
    <Typography
      variant={variant}
      component="span"
      sx={{
        color: getSignalReturnColor(value, theme),
        fontFeatureSettings: '"tnum"',
        fontVariantNumeric: 'tabular-nums',
        ...sx,
      }}
    >
      {text}
    </Typography>
  );
}
