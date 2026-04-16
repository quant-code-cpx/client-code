import type { Strategy } from 'src/api/strategy';

import DialogContentText from '@mui/material/DialogContentText';

import { ConfirmDialog } from 'src/components/confirm-dialog';

// ----------------------------------------------------------------------

interface StrategyDeleteDialogProps {
  open: boolean;
  strategy: Strategy | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  submitting: boolean;
}

export function StrategyDeleteDialog({
  open,
  strategy,
  onClose,
  onConfirm,
  submitting,
}: StrategyDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      title="确认删除"
      content={
        <DialogContentText>
          确定要删除策略 <strong>{strategy?.name}</strong> 吗？
          <br />
          删除后不可恢复，关联的回测记录也将被同步删除。
        </DialogContentText>
      }
      onClose={onClose}
      onConfirm={onConfirm}
      submitting={submitting}
      confirmLabel="确认删除"
    />
  );
}
