import type { ReactNode } from 'react';
import type { Theme , SxProps } from '@mui/material/styles';
import type { TypographyProps } from '@mui/material/Typography';

// ----------------------------------------------------------------------

export type PageHeaderProps = {
  title: ReactNode;
  /** Right-side action area (e.g. a Button or a Stack of Buttons). */
  action?: ReactNode;
  /** Optional description / sub-title rendered below the title. */
  description?: ReactNode;
  variant?: TypographyProps['variant'];
  sx?: SxProps<Theme>;
};
