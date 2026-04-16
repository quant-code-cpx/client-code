import Typography from '@mui/material/Typography';

import type { ColoredNumberProps } from './types';

// ----------------------------------------------------------------------

/**
 * Renders a financial number with Chinese stock market colour conventions:
 *   positive → red (error.main)
 *   negative → green (success.main)
 *   zero / null → muted (text.secondary)
 *
 * Usage:
 *   <ColoredNumber value={pctChg} format="percent" />
 *   <ColoredNumber value={priceChange} format="change" />
 *   <ColoredNumber value={someValue} decimals={2} />
 */
export function ColoredNumber({
  value,
  format = 'raw',
  decimals = 2,
  variant = 'body2',
  sx,
  placeholder = '-',
}: ColoredNumberProps) {
  if (value === null || value === undefined) {
    return (
      <Typography variant={variant} sx={{ color: 'text.secondary', ...sx }}>
        {placeholder}
      </Typography>
    );
  }

  let color: string;
  if (value > 0) color = 'error.main';
  else if (value < 0) color = 'success.main';
  else color = 'text.secondary';

  let text: string;
  if (format === 'percent') {
    const sign = value > 0 ? '+' : '';
    text = `${sign}${value.toFixed(decimals)}%`;
  } else if (format === 'change') {
    const sign = value > 0 ? '+' : '';
    text = `${sign}${value.toFixed(decimals)}`;
  } else {
    text = value.toFixed(decimals);
  }

  return (
    <Typography variant={variant} sx={{ color, ...sx }}>
      {text}
    </Typography>
  );
}
