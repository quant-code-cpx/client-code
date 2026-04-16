import type { PortfolioListItem } from 'src/api/portfolio';

import DialogContentText from '@mui/material/DialogContentText';

import { ConfirmDialog } from 'src/components/confirm-dialog';

// ----------------------------------------------------------------------

interface PortfolioDeleteDialogProps {
  open: boolean;
  portfolio: PortfolioListItem | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export function PortfolioDeleteDialog({
  open,
  portfolio,
  onClose,
  onConfirm,
  submitting,
}: PortfolioDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="确认删除"
      content={
        <DialogContentText>
          确定要删除组合 <strong>{portfolio?.name}</strong> 吗？删除后不可恢复。
        </DialogContentText>
      }
      onClose={onClose}
      onConfirm={onConfirm}
      submitting={submitting}
      confirmLabel="确认删除"
    />
  );
}
