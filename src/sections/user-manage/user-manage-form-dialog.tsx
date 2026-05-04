import type {
  UserRole,
  CreateUserDto,
  UserManageItem,
  AdminUpdateUserDto,
} from 'src/api/user-manage';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
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

import { QuotaField } from './quota-field';
import {
  validateQuota,
  validateEmail,
  validateAccount,
  validateNickname,
  validatePassword,
  generateStrongPassword,
} from './user-manage-utils';

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
  const [clearCountdown, setClearCountdown] = useState(30);

  // 编辑模式字段
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [wechat, setWechat] = useState('');
  const [backtestQuota, setBacktestQuota] = useState('');
  const [watchlistLimit, setWatchlistLimit] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!createResult) return undefined;
    setClearCountdown(30);
    const timer = window.setInterval(() => {
      setClearCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setCreateResult('');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [createResult]);

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
      setClearCountdown(30);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, row]);

  const handleSubmit = async () => {
    setError('');
    if (mode === 'create') {
      if (!validateAccount(account.trim())) {
        setError('账号需为 4–32 位字母、数字或下划线');
        return;
      }
      if (!validateNickname(newNickname)) {
        setError('昵称需为 1–32 个字符');
        return;
      }
      if (!validatePassword(password.trim())) {
        setError('密码至少 8 位，且需包含字母和数字');
        return;
      }
      if (password.trim() !== confirmPassword.trim()) {
        setError('两次输入的密码不一致');
        return;
      }
      setSubmitting(true);
      try {
        const initialPassword = await onCreate({
          account: account.trim(),
          nickname: newNickname.trim(),
          role: newRole,
          password: password.trim(),
        });
        setCreateResult(initialPassword);
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败，请重试');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!row) return;
      if (nickname.trim() && !validateNickname(nickname)) {
        setError('昵称需为 1–32 个字符');
        return;
      }
      if (!validateEmail(email.trim())) {
        setError('邮箱格式不正确');
        return;
      }
      if (!validateQuota(backtestQuota)) {
        setError('回测配额需为“不限”或大于等于 0 的整数');
        return;
      }
      if (!validateQuota(watchlistLimit)) {
        setError('监控股票数上限需为“不限”或大于等于 0 的整数');
        return;
      }
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

  const handleGeneratePassword = () => {
    const nextPassword = generateStrongPassword();
    setPassword(nextPassword);
    setConfirmPassword(nextPassword);
    setShowPassword(true);
    setShowConfirm(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isCreate ? '创建用户' : '编辑用户信息'}</DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isCreate ? (
            createResult ? (
              /* ── 创建成功：展示初始密码 ── */
              <>
                <Alert severity="success">用户创建成功！初始密码仅本次可见，请妥善告知用户。</Alert>
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
                    aria-label="复制初始密码"
                  >
                    <Iconify icon="solar:copy-bold" width={18} />
                  </IconButton>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="caption" color="warning.main">
                    {clearCountdown}s 后自动清除，关闭后将无法再次查看
                  </Typography>
                  <Button size="small" color="warning" onClick={() => setCreateResult('')}>
                    立即清除
                  </Button>
                </Stack>
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
                <Button
                  variant="outlined"
                  color="info"
                  onClick={handleGeneratePassword}
                  startIcon={<Iconify icon="solar:shield-keyhole-bold-duotone" />}
                >
                  随机生成强密码
                </Button>
                <TextField
                  label="初始密码"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            edge="end"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? '隐藏初始密码' : '显示初始密码'}
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
              <QuotaField label="回测配额" value={backtestQuota} onChange={setBacktestQuota} />
              <QuotaField
                label="监控股票数上限"
                value={watchlistLimit}
                onChange={setWatchlistLimit}
              />
            </>
          )}

          {error && <Alert severity="error">{error}</Alert>}
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
