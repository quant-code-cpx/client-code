import type { UserRole, UserStatus } from 'src/api/user-manage';

import Select from '@mui/material/Select';
import Toolbar from '@mui/material/Toolbar';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { ROLE_LABEL, STATUS_LABEL } from 'src/api/user-manage';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type UserManageTableToolbarProps = {
  filterAccount: string;
  filterStatus: UserStatus | '';
  filterRole: UserRole | '';
  onFilterAccount: (value: string) => void;
  onFilterStatus: (value: UserStatus | '') => void;
  onFilterRole: (value: UserRole | '') => void;
};

const USER_STATUS_OPTIONS: { value: UserStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'ACTIVE', label: STATUS_LABEL.ACTIVE },
  { value: 'DEACTIVATED', label: STATUS_LABEL.DEACTIVATED },
];

const USER_ROLE_OPTIONS: { value: UserRole | ''; label: string }[] = [
  { value: '', label: '全部角色' },
  { value: 'SUPER_ADMIN', label: ROLE_LABEL.SUPER_ADMIN },
  { value: 'ADMIN', label: ROLE_LABEL.ADMIN },
  { value: 'USER', label: ROLE_LABEL.USER },
];

export function UserManageTableToolbar({
  filterAccount,
  filterStatus,
  filterRole,
  onFilterAccount,
  onFilterStatus,
  onFilterRole,
}: UserManageTableToolbarProps) {
  return (
    <Toolbar
      sx={{
        height: 96,
        display: 'flex',
        gap: 2,
        p: (theme) => theme.spacing(0, 1, 0, 3),
      }}
    >
      <OutlinedInput
        size="small"
        value={filterAccount}
        onChange={(e) => onFilterAccount(e.target.value)}
        placeholder="搜索账号..."
        startAdornment={
          <InputAdornment position="start">
            <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        }
        sx={{ width: 200 }}
      />

      <FormControl sx={{ width: 140 }} size="small">
        <InputLabel>状态</InputLabel>
        <Select
          label="状态"
          value={filterStatus}
          onChange={(e) => onFilterStatus(e.target.value as UserStatus | '')}
        >
          {USER_STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ width: 140 }} size="small">
        <InputLabel>角色</InputLabel>
        <Select
          label="角色"
          value={filterRole}
          onChange={(e) => onFilterRole(e.target.value as UserRole | '')}
        >
          {USER_ROLE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Toolbar>
  );
}
