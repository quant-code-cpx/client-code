import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { useAuth } from 'src/auth';
import { userManageApi } from 'src/api/user-manage';

// ----------------------------------------------------------------------

interface ProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileEditDialog({ open, onClose }: ProfileEditDialogProps) {
  const { userProfile, loadProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [wechat, setWechat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open && userProfile) {
      setNickname(userProfile.nickname || '');
      setEmail(userProfile.email || '');
      setWechat(userProfile.wechat || '');
      setError('');
      setSuccess(false);
    }
  }, [open, userProfile]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await userManageApi.updateProfile({ nickname, email, wechat });
      await loadProfile();
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !submitting && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>修改资料</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {success && <Alert severity="success">资料已更新</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="昵称"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 64 }}
          />

          <TextField
            label="邮箱"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 128 }}
          />

          <TextField
            label="微信号"
            value={wechat}
            onChange={(e) => setWechat(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 64 }}
          />

          <Box sx={{ typography: 'caption', color: 'text.secondary' }}>* 所有字段均为选填</Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={14} /> : null}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
