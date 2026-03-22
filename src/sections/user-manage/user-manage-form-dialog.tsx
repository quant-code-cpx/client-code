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
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { usePermission } from 'src/permission';
import { ROLE_LABEL } from 'src/api/user-manage';

// ----------------------------------------------------------------------

type Mode = 'create' | 'edit';

type UserManageFormDialogProps = {
  open: boolean;
  mode: Mode;
  row?: UserManageItem | null;
  onClose: () => void;
  onCreate: (data: CreateUserDto) => Promise<void>;
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
      setSubmitting(true);
      try {
        await onCreate({ account: account.trim(), nickname: newNickname.trim(), role: newRole });
        onClose();
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
            </>
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
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={14} /> : null}
        >
          {isCreate ? '创建' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
