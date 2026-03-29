import type { UserManageItem } from 'src/api/user-manage';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { fDate } from 'src/utils/format-time';

import { usePermission } from 'src/permission';
import { ROLE_LABEL, STATUS_LABEL } from 'src/api/user-manage';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type UserManageTableRowProps = {
  row: UserManageItem;
  onEdit: (row: UserManageItem) => void;
  onToggleStatus: (row: UserManageItem) => void;
  onResetPassword: (row: UserManageItem) => void;
  onDelete: (row: UserManageItem) => void;
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
  onEdit,
  onToggleStatus,
  onResetPassword,
  onDelete,
}: UserManageTableRowProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const { canManage } = usePermission();

  const handleOpen = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => setAnchorEl(null), []);

  const canAct = canManage(row.role);

  return (
    <>
      <TableRow hover tabIndex={-1}>
        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.id}</TableCell>

        <TableCell>
          <Box sx={{ fontWeight: 600 }}>{row.account}</Box>
          {row.nickname && <Box sx={{ color: 'text.secondary', fontSize: 12 }}>{row.nickname}</Box>}
        </TableCell>

        <TableCell>
          <Label color={ROLE_COLOR[row.role] ?? 'default'}>{ROLE_LABEL[row.role]}</Label>
        </TableCell>

        <TableCell>
          <Label color={STATUS_COLOR[row.status] ?? 'default'}>{STATUS_LABEL[row.status]}</Label>
        </TableCell>

        <TableCell sx={{ color: 'text.secondary' }}>{row.email ?? '—'}</TableCell>

        <TableCell align="center">{row.backtestQuota}</TableCell>

        <TableCell align="center">{row.watchlistLimit}</TableCell>

        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>
          {row.createdAt ? fDate(row.createdAt, 'YYYY-MM-DD') : '—'}
        </TableCell>

        <TableCell align="right">
          <IconButton onClick={handleOpen} disabled={!canAct}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
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
        </MenuList>
      </Popover>
    </>
  );
}
