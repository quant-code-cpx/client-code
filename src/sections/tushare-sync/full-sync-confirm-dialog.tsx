import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  taskCount: number;
  confirmText: string;
  isSyncActionLocked: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirmTextChange: (value: string) => void;
  onConfirm: () => void;
};

export function FullSyncConfirmDialog({
  open,
  taskCount,
  confirmText,
  isSyncActionLocked,
  isSubmitting,
  onClose,
  onConfirmTextChange,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>确认全量同步</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          全量同步会拉取历史数据，预计耗时较长。请输入 <strong>全量</strong> 确认继续。
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          本次将影响 {taskCount} 个任务。
        </Typography>
        <TextField
          fullWidth
          size="small"
          label="确认文本"
          value={confirmText}
          onChange={(event) => onConfirmTextChange(event.target.value)}
          placeholder="全量"
        />
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          取消
        </Button>
        <Button
          color="warning"
          variant="contained"
          disabled={confirmText !== '全量' || isSyncActionLocked}
          loading={isSubmitting}
          onClick={onConfirm}
        >
          确认全量同步
        </Button>
      </DialogActions>
    </Dialog>
  );
}
