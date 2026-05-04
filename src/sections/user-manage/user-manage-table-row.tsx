import type { UserManageItem } from 'src/api/user-manage';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Popover from '@mui/material/Popover';
import Checkbox from '@mui/material/Checkbox';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { fDate } from 'src/utils/format-time';

import { useAuth } from 'src/auth';
import { CONFIG } from 'src/config-global';
import { usePermission } from 'src/permission';
import { ROLE_LABEL, STATUS_LABEL } from 'src/api/user-manage';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { formatQuota, isLockedUser } from './user-manage-utils';

// ----------------------------------------------------------------------

type UserManageTableRowProps = {
  row: UserManageItem;
  selected: boolean;
  onSelect: (row: UserManageItem, checked: boolean) => void;
  onEdit: (row: UserManageItem) => void;
  onUpdateRole: (row: UserManageItem) => void;
  onToggleStatus: (row: UserManageItem) => void;
  onUnlock: (row: UserManageItem) => void;
  onResetPassword: (row: UserManageItem) => void;
  onDelete: (row: UserManageItem) => void;
  onRestore: (row: UserManageItem) => void;
};

const ROLE_COLOR: Record<string, 'default' | 'primary' | 'warning'> = {
  SUPER_ADMIN: 'warning',
  ADMIN: 'primary',
  USER: 'default',
};

const STATUS_COLOR: Record<string, 'success' | 'error' | 'default'> = {
  ACTIVE: 'success',
  DEACTIVATED: 'error',
  DELETED: 'default',
};

export function UserManageTableRow({
  row,
  selected,
  onSelect,
  onEdit,
  onUpdateRole,
  onToggleStatus,
  onUnlock,
  onResetPassword,
  onDelete,
  onRestore,
}: UserManageTableRowProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { canManage } = usePermission();
  const { userProfile } = useAuth();

  const handleOpen = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => setAnchorEl(null), []);

  const canAct = canManage(row.role);
  const isSelf = userProfile?.id === row.id;
  const locked = isLockedUser(row);
  const deleted = row.status === 'DELETED';
  const actionTip = isSelf
    ? '请通过个人资料页修改自身信息'
    : row.role === 'SUPER_ADMIN'
      ? '不允许操作超级管理员账号'
      : '当前账号无权操作该用户';

  return (
    <>
      <TableRow
        hover
        tabIndex={-1}
        selected={selected}
        sx={deleted ? { bgcolor: 'action.disabledBackground' } : undefined}
      >
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            disabled={!canAct || deleted}
            onChange={(event) => onSelect(row, event.target.checked)}
            slotProps={{ input: { 'aria-label': `选择 ${row.account}` } }}
          />
        </TableCell>

        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.id}</TableCell>

        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ fontWeight: 600 }}>{row.account}</Box>
            {isSelf && <Label color="info">本人</Label>}
          </Stack>
          {row.nickname && <Box sx={{ color: 'text.secondary', fontSize: 12 }}>{row.nickname}</Box>}
        </TableCell>

        <TableCell>
          <Label color={ROLE_COLOR[row.role] ?? 'default'}>{ROLE_LABEL[row.role]}</Label>
        </TableCell>

        <TableCell>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Label color={locked ? 'warning' : (STATUS_COLOR[row.status] ?? 'default')}>
              {locked ? '已锁定' : STATUS_LABEL[row.status]}
            </Label>
            {locked && row.lockedUntil && (
              <Tooltip title={`锁定至 ${fDate(row.lockedUntil, 'YYYY-MM-DD HH:mm')}`}>
                <Box component="span" sx={{ lineHeight: 0, color: 'warning.main' }}>
                  <Iconify icon="solar:lock-keyhole-bold" width={16} />
                </Box>
              </Tooltip>
            )}
          </Stack>
        </TableCell>

        <TableCell sx={{ color: 'text.secondary' }}>{row.email ?? '—'}</TableCell>

        <TableCell align="center">{formatQuota(row.backtestQuota)}</TableCell>

        <TableCell align="center">{formatQuota(row.watchlistLimit)}</TableCell>

        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
          {row.lastLoginAt ? fDate(row.lastLoginAt, 'YYYY-MM-DD') : '未登录'}
        </TableCell>

        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
          {row.createdAt ? fDate(row.createdAt, 'YYYY-MM-DD') : '—'}
        </TableCell>

        <TableCell align="right">
          <Tooltip title={!canAct ? actionTip : ''}>
            <Box component="span">
              <IconButton
                onClick={handleOpen}
                disabled={!canAct}
                aria-label={`打开 ${row.account} 的操作菜单`}
              >
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Box>
          </Tooltip>
        </TableCell>
      </TableRow>

      <Popover
        open={!!anchorEl}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuList
          disablePadding
          sx={{
            p: 0.5,
            gap: 0.5,
            width: 160,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              px: 1,
              gap: 2,
              borderRadius: 0.75,
            },
          }}
        >
          <MenuItem
            onClick={() => {
              handleClose();
              onEdit(row);
            }}
          >
            <Iconify icon="solar:pen-bold" />
            编辑信息
          </MenuItem>

          {CONFIG.userManageFeatures.updateRole && !isSelf && !deleted && (
            <MenuItem
              onClick={() => {
                handleClose();
                onUpdateRole(row);
              }}
            >
              <Iconify icon="solar:user-id-bold" />
              调整角色
            </MenuItem>
          )}

          {!deleted && (
            <MenuItem
              onClick={() => {
                handleClose();
                onToggleStatus(row);
              }}
              sx={{ color: row.status === 'ACTIVE' ? 'warning.main' : 'success.main' }}
            >
              <Iconify
                icon={
                  row.status === 'ACTIVE'
                    ? 'solar:shield-keyhole-bold-duotone'
                    : 'solar:check-circle-bold'
                }
              />
              {row.status === 'ACTIVE' ? '禁用账号' : '启用账号'}
            </MenuItem>
          )}

          {CONFIG.userManageFeatures.unlock && locked && (
            <MenuItem
              onClick={() => {
                handleClose();
                onUnlock(row);
              }}
              sx={{ color: 'warning.main' }}
            >
              <Iconify icon="solar:lock-keyhole-unlocked-bold" />
              解锁账号
            </MenuItem>
          )}

          <MenuItem
            onClick={() => {
              handleClose();
              onResetPassword(row);
            }}
            sx={{ color: 'info.main' }}
          >
            <Iconify icon="solar:restart-bold" />
            重置密码
          </MenuItem>

          {deleted ? (
            CONFIG.userManageFeatures.restore && (
              <MenuItem
                onClick={() => {
                  handleClose();
                  onRestore(row);
                }}
                sx={{ color: 'success.main' }}
              >
                <Iconify icon="solar:refresh-circle-bold" />
                恢复用户
              </MenuItem>
            )
          ) : (
            <MenuItem
              onClick={() => {
                handleClose();
                onDelete(row);
              }}
              sx={{ color: 'error.main' }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" />
              删除用户
            </MenuItem>
          )}
        </MenuList>
      </Popover>
    </>
  );
}
