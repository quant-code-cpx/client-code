import type { ReactNode } from 'react';
import type { Theme , SxProps } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type EmptyContentProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  sx?: SxProps<Theme>;
};

export type TableEmptyRowProps = {
  colSpan: number;
  message?: string;
};
