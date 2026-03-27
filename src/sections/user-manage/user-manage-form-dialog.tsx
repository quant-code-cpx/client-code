import type {
  UserRole,
  CreateUserDto,
  UserManageItem,
  AdminUpdateUserDto,
} from 'src/api/user-manage';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { usePermission } from 'src/permission';
import { ROLE_LABEL } from 'src/api/user-manage';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Mode = 'create' | 'edit';

type UserManageFormDialogProps = {
  open: boolean;
  mode: Mode;
  row?: UserManageItem | null;
  onClose: () => void;
  /** 返回服务端生成的初始密码，供界面展示 */
  onCreate: (data: CreateUserDto) => Promise<string>;
  onUpdate: (data: AdminUpdateUserDto) => Promise<void>;
};

// 创建时，ADMIN 只能创建 USER；SUPER_ADMIN 可创建 ADMIN 和 USER
function useCreatableRoles(): { value: UserRole; label: string }[] {
  const { canManage } = usePermission();
  const options: { value: UserRole; label: string }[] = [];
  if (canManage('ADMIN')) options.push({ value: 'ADMIN', label: ROLE_LABEL.ADMIN });
  if (canManage('USER')) options.push({ value: 'USER', label: ROLE_LABEL.USER });
  return options;
}

export function UserManageFormDialog({
  open,
  mode,
  row,
  onClose,
  onCreate,
  onUpdate,
}: UserManageFormDialogProps) {
  const creatableRoles = useCreatableRoles();

  // 创建模式字段
  const [account, setAccount] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('USER');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  /** 创建成功后的初始密码，显示给管理员 */
  const [createResult, setCreateResult] = useState('');

  // 编辑模式字段
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [wechat, setWechat] = useState('');
  const [backtestQuota, setBacktestQuota] = useState('');
  const [watchlistLimit, setWatchlistLimit] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 打开编辑对话框时，回填已有数据
  useEffect(() => {
    if (open && mode === 'edit' && row) {
      setNickname(row.nickname ?? '');
      setEmail(row.email ?? '');
      setWechat(row.wechat ?? '');
      setBacktestQuota(String(row.backtestQuota ?? ''));
      setWatchlistLimit(String(row.watchlistLimit ?? ''));
      setError('');
    }
    if (open && mode === 'create') {
      setAccount('');
      setNewNickname('');
      setNewRole(creatableRoles[creatableRoles.length - 1]?.value ?? 'USER');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirm(false);
      setCreateResult('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, row]);

  const handleSubmit = async () => {
    setError('');
    if (mode === 'create') {
      if (!account.trim()) {
        setError('账号不能为空');
        return;
      }
      if (!newNickname.trim()) {
        setError('昵称不能为空');
        return;
      }
      if (password) {
        if (password.trim().length < 8) {
          setError('密码至少需要8位');
          return;
        }
        if (password.trim() !== confirmPassword.trim()) {
          setError('两次输入的密码不一致');
          return;
        }
      }
      setSubmitting(true);
      try {
        const initialPassword = await onCreate({
          account: account.trim(),
          nickname: newNickname.trim(),
          role: newRole,
          ...(password.trim() ? { password: password.trim() } : {}),
        });
        setCreateResult(initialPassword);
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败，请重试');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!row) return;
      setSubmitting(true);
      try {
        await onUpdate({
          id: row.id,
          nickname: nickname.trim() || undefined,
          email: email.trim() || undefined,
          wechat: wechat.trim() || undefined,
          backtestQuota: backtestQuota !== '' ? Number(backtestQuota) : undefined,
          watchlistLimit: watchlistLimit !== '' ? Number(watchlistLimit) : undefined,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败，请重试');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const isCreate = mode === 'create';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isCreate ? '创建用户' : '编辑用户信息'}</DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isCreate ? (
            createResult ? (
              /* ── 创建成功：展示初始密码 ── */
              <>
                <Typography variant="body2" color="text.secondary">
                  用户创建成功！初始密码如下，请妥善告知用户：
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
                    {createResult}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(createResult)}
                    title="复制密码"
                  >
                    <Iconify icon="solar:copy-bold" width={18} />
                  </IconButton>
                </Box>
                <Typography variant="caption" color="warning.main">
                  此密码仅显示一次，关闭后将无法再次查看
                </Typography>
              </>
            ) : (
              /* ── 创建表单 ── */
              <>
                <TextField
                  label="账号"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  required
                  autoFocus
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="昵称"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <FormControl fullWidth>
                  <InputLabel shrink>角色</InputLabel>
                  <Select
                    label="角色"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    notched
                  >
                    {creatableRoles.map((r) => (
                      <MenuItem key={r.value} value={r.value}>
                        {r.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="初始密码（留空自动生成）"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={() => setShowPassword((v) => !v)}
                          >
                            <Iconify
                              icon={showPassword ? 'solar:eye-closed-bold' : 'solar:eye-bold'}
                              width={20}
                            />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label="确认密码"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!password}
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={() => setShowConfirm((v) => !v)}
                            disabled={!password}
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
              </>
            )
          ) : (
            <>
              <TextField
                label="昵称"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="微信号"
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="回测配额"
                type="number"
                value={backtestQuota}
                onChange={(e) => setBacktestQuota(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }}
              />
              <TextField
                label="监控股票数上限"
                type="number"
                value={watchlistLimit}
                onChange={(e) => setWatchlistLimit(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 0 } }}
              />
            </>
          )}

          {error && <Box sx={{ color: 'error.main', fontSize: 13 }}>{error}</Box>}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          {isCreate && createResult ? '关闭' : '取消'}
        </Button>
        {!(isCreate && createResult) && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={14} /> : null}
          >
            {isCreate ? '创建' : '保存'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
