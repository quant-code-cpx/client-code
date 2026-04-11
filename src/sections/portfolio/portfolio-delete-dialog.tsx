import type { PortfolioListItem } from 'src/api/portfolio';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

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
    <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="xs" fullWidth>
      <DialogTitle>确认删除</DialogTitle>
      <DialogContent>
        <DialogContentText>
          确定要删除组合 <strong>{portfolio?.name}</strong> 吗？删除后不可恢复。
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
