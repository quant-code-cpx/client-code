import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type UserManageResetPasswordDialogProps = {
  open: boolean;
  account: string;
  userId: number;
  onClose: () => void;
  /** 执行重置，返回服务端生成的新密码 */
  onReset: (id: number, newPassword?: string) => Promise<string>;
};

export function UserManageResetPasswordDialog({
  open,
  account,
  userId,
  onClose,
  onReset,
}: UserManageResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  /** 重置成功后的新密码，展示给管理员 */
  const [result, setResult] = useState('');

  const handleClose = () => {
    if (submitting) return;
    setNewPassword('');
    setConfirmPassword('');
    setShowNew(false);
    setShowConfirm(false);
    setError('');
    setResult('');
    onClose();
  };

  const handleSubmit = async () => {
    setError('');
    if (newPassword) {
      if (newPassword.trim().length < 8) {
        setError('密码至少需要8位');
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        setError('两次输入的密码不一致');
        return;
      }
    }
    setSubmitting(true);
    try {
      const resultPassword = await onReset(userId, newPassword.trim() || undefined);
      setResult(resultPassword);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>重置密码</DialogTitle>

      <DialogContent>
        {result ? (
          /* ── 重置成功：展示新密码 ── */
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              账号「{account}」的密码已重置成功，新密码如下：
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'action.hover',
                borderRadius: 1,
                px: 2,
                py: 1.5,
              }}
            >
              <Typography
                variant="body1"
                sx={{ fontFamily: 'monospace', flexGrow: 1, fontWeight: 700 }}
              >
                {result}
              </Typography>
              <IconButton
                size="small"
                onClick={() => navigator.clipboard.writeText(result)}
                title="复制密码"
              >
                <Iconify icon="solar:copy-bold" width={18} />
              </IconButton>
            </Box>
            <Typography variant="caption" color="warning.main">
              此密码仅显示一次，关闭后将无法再次查看
            </Typography>
          </Box>
        ) : (
          /* ── 重置表单 ── */
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              确定要重置账号「{account}」的密码吗？可以指定新密码，留空则由系统自动生成。
            </Typography>
            <TextField
              label="新密码（留空自动生成）"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setShowNew((v) => !v)}
                      >
                        <Iconify
                          icon={showNew ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
                          width={20}
                        />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              label="确认新密码"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={!newPassword}
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setShowConfirm((v) => !v)}
                        disabled={!newPassword}
                      >
                        <Iconify
                          icon={showConfirm ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
                          width={20}
                        />
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {error && <Box sx={{ color: 'error.main', fontSize: 13 }}>{error}</Box>}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          {result ? '关闭' : '取消'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            color="warning"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={14} /> : null}
          >
            确认重置
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
