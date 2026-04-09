import type { Strategy } from 'src/api/strategy';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

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
    <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="xs" fullWidth>
      <DialogTitle>确认删除</DialogTitle>
      <DialogContent>
        <DialogContentText>
          确定要删除策略 <strong>{strategy?.name}</strong> 吗？
          <br />
          删除后不可恢复，关联的回测记录也将被同步删除。
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={submitting}
          loading={submitting}
        >
          确认删除
        </Button>
      </DialogActions>
    </Dialog>
  );
}
