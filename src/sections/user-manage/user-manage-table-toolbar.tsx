import type { UserRole, UserStatusFilter } from 'src/api/user-manage';

import dayjs from 'dayjs';

import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Toolbar from '@mui/material/Toolbar';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';

import { ROLE_LABEL, STATUS_FILTER_LABEL } from 'src/api/user-manage';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type UserManageTableToolbarProps = {
  filterAccount: string;
  filterStatus: UserStatusFilter | '';
  filterRole: UserRole | '';
  createdFrom: string;
  createdTo: string;
  includeDeleted: boolean;
  onFilterAccount: (value: string) => void;
  onFilterStatus: (value: UserStatusFilter | '') => void;
  onFilterRole: (value: UserRole | '') => void;
  onCreatedFrom: (value: string) => void;
  onCreatedTo: (value: string) => void;
  onIncludeDeleted: (value: boolean) => void;
};

const USER_STATUS_OPTIONS: { value: UserStatusFilter | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'ACTIVE', label: STATUS_FILTER_LABEL.ACTIVE },
  { value: 'DEACTIVATED', label: STATUS_FILTER_LABEL.DEACTIVATED },
  { value: 'LOCKED', label: STATUS_FILTER_LABEL.LOCKED },
];

const DELETED_STATUS_OPTION: { value: UserStatusFilter; label: string } = {
  value: 'DELETED',
  label: STATUS_FILTER_LABEL.DELETED,
};

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
  createdFrom,
  createdTo,
  includeDeleted,
  onFilterAccount,
  onFilterStatus,
  onFilterRole,
  onCreatedFrom,
  onCreatedTo,
  onIncludeDeleted,
}: UserManageTableToolbarProps) {
  const statusOptions = includeDeleted
    ? [...USER_STATUS_OPTIONS, DELETED_STATUS_OPTION]
    : USER_STATUS_OPTIONS;

  return (
    <Toolbar
      sx={{
        minHeight: 96,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        p: (theme) => theme.spacing(2, 2, 2, 3),
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
          onChange={(e) => onFilterStatus(e.target.value as UserStatusFilter | '')}
        >
          {statusOptions.map((opt) => (
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

      <DatePicker
        label="注册开始"
        value={createdFrom ? dayjs(createdFrom) : null}
        onChange={(value) => onCreatedFrom(value?.format('YYYY-MM-DD') ?? '')}
        format="YYYY-MM-DD"
        slotProps={{
          textField: { size: 'small', sx: { width: 150 } },
          field: { clearable: true },
        }}
      />

      <DatePicker
        label="注册结束"
        value={createdTo ? dayjs(createdTo) : null}
        onChange={(value) => onCreatedTo(value?.format('YYYY-MM-DD') ?? '')}
        format="YYYY-MM-DD"
        slotProps={{
          textField: { size: 'small', sx: { width: 150 } },
          field: { clearable: true },
        }}
      />

      <FormControlLabel
        control={
          <Switch
            checked={includeDeleted}
            onChange={(event) => onIncludeDeleted(event.target.checked)}
          />
        }
        label="包含已删除"
      />
    </Toolbar>
  );
}
