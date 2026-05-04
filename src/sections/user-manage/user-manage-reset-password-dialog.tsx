import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
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

import { validatePassword, generateStrongPassword } from './user-manage-utils';

// ----------------------------------------------------------------------

type UserManageResetPasswordDialogProps = {
  open: boolean;
  account: string;
  userId: number;
  onClose: () => void;
  /** 执行重置，返回服务端生成的新密码 */
  onReset: (id: number, newPassword: string) => Promise<string>;
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
    if (!newPassword.trim()) {
      setError('密码不能为空');
      return;
    }
    if (!validatePassword(newPassword.trim())) {
      setError('密码至少 8 位，且需包含字母和数字');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('两次输入的密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      const resultPassword = await onReset(userId, newPassword.trim());
      setResult(resultPassword);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePassword = () => {
    const nextPassword = generateStrongPassword();
    setNewPassword(nextPassword);
    setConfirmPassword(nextPassword);
    setShowNew(true);
    setShowConfirm(true);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>重置密码</DialogTitle>

      <DialogContent>
        {result ? (
          /* ── 重置成功：展示新密码 ── */
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Alert severity="success">账号「{account}」的密码已重置成功，新密码仅本次可见。</Alert>
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
                aria-label="复制新密码"
              >
                <Iconify icon="solar:copy-bold" width={18} />
              </IconButton>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Typography variant="caption" color="warning.main">
                请通过安全渠道告知用户，关闭后将无法再次查看
              </Typography>
              <Button size="small" color="warning" onClick={() => setResult('')}>
                立即清除
              </Button>
            </Stack>
          </Box>
        ) : (
          /* ── 重置表单 ── */
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              请输入账号「{account}」的新密码：
            </Typography>
            <Button
              variant="outlined"
              color="info"
              onClick={handleGeneratePassword}
              startIcon={<Iconify icon="solar:shield-keyhole-bold-duotone" />}
            >
              随机生成强密码
            </Button>
            <TextField
              label="新密码"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setShowNew((v) => !v)}
                        aria-label={showNew ? '隐藏新密码' : '显示新密码'}
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
              required
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? '隐藏确认密码' : '显示确认密码'}
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
            {error && <Alert severity="error">{error}</Alert>}
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
