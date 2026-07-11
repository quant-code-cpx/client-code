import type { UserRole, UserManageItem, UpdateUserRoleDto } from 'src/api/user-manage';

import { useState, useEffect } from 'react';

import Alert from '@mui/material/Alert';
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

import { usePermission } from 'src/permission';
import { ROLE_LABEL } from 'src/api/user-manage';

// ----------------------------------------------------------------------

type UserRoleDialogProps = {
  open: boolean;
  row: UserManageItem | null;
  onClose: () => void;
  onSubmit: (data: UpdateUserRoleDto) => Promise<void>;
};

export function UserRoleDialog({ open, row, onClose, onSubmit }: UserRoleDialogProps) {
  const { canManage } = usePermission();
  const [role, setRole] = useState<Exclude<UserRole, 'SUPER_ADMIN'>>('USER');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !row) return;
    setRole(row.role === 'ADMIN' ? 'ADMIN' : 'USER');
    setReason('');
    setError('');
  }, [open, row]);

  const roleOptions: Exclude<UserRole, 'SUPER_ADMIN'>[] = canManage('ADMIN')
    ? ['ADMIN', 'USER']
    : ['USER'];

  const handleSubmit = async () => {
    if (!row) return;
    if (!reason.trim()) {
      setError('请填写调整角色的原因，便于审计追溯');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ id: row.id, role, reason: reason.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '调整角色失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="xs" fullWidth>
      <DialogTitle>调整角色</DialogTitle>
      <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Alert severity="warning" variant="outlined">
          角色调整会影响接口访问范围，并写入审计日志。超级管理员之间仍不可互相编辑或降权。
        </Alert>

        <TextField label="账号" value={row?.account ?? ''} disabled />

        <FormControl fullWidth>
          <InputLabel>目标角色</InputLabel>
          <Select
            label="目标角色"
            value={role}
            onChange={(event) => setRole(event.target.value as Exclude<UserRole, 'SUPER_ADMIN'>)}
          >
            {roleOptions.map((item) => (
              <MenuItem key={item} value={item}>
                {ROLE_LABEL[item]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="调整原因"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minRows={3}
          multiline
          required
          placeholder="例如：岗位变更，降为普通用户"
        />

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          loading={submitting}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
