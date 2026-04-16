import type { Theme , SxProps } from '@mui/material/styles';
import type { TypographyProps } from '@mui/material/Typography';

// ----------------------------------------------------------------------

export type ColoredNumberProps = {
  /** The numeric value to display. Pass null/undefined to render a dash. */
  value: number | null | undefined;
  /**
   * How to format the displayed string.
   * - `'raw'`      → value as-is (default)
   * - `'percent'`  → appends '%', prepends '+' for positives
   * - `'change'`   → prepends '+'/'-' sign only
   */
  format?: 'raw' | 'percent' | 'change';
  /** Number of decimal places when format is 'raw' or 'change'. Default 2. */
  decimals?: number;
  /** Typography variant passed through. */
  variant?: TypographyProps['variant'];
  sx?: SxProps<Theme>;
  /** Fallback text when value is null/undefined. Defaults to '-'. */
  placeholder?: string;
};
