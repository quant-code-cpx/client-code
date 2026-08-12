import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

type Props = {
  open: boolean;
  reportId: string;
  onClose: () => void;
  onMessage?: (message: string, severity: 'success' | 'error' | 'info') => void;
};

export function ReportShareDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>分享报告（未开放）</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info">
          分享链接的创建、查询和吊销接口尚未开放。当前不会向后端发送分享请求。
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
