import type { ReactNode } from 'react';
import type { ButtonProps } from '@mui/material/Button';

// ----------------------------------------------------------------------

export type ConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  content: ReactNode;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  submitting?: boolean;
  confirmLabel?: string;
  confirmColor?: ButtonProps['color'];
  cancelLabel?: string;
};
