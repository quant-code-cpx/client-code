import type { AuditAction } from 'src/api/user-manage';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { AUDIT_ACTION_LABEL } from 'src/api/user-manage';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

interface AuditLogToolbarProps {
  filterOperatorId: number | '';
  filterTargetId: number | '';
  filterAction: AuditAction | '';
  startDate: string;
  endDate: string;
  onFilterOperatorId: (value: number | '') => void;
  onFilterTargetId: (value: number | '') => void;
  onFilterAction: (value: AuditAction | '') => void;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function AuditLogToolbar({
  filterOperatorId,
  filterTargetId,
  filterAction,
  startDate,
  endDate,
  onFilterOperatorId,
  onFilterTargetId,
  onFilterAction,
  onStartDate,
  onEndDate,
  onSearch,
  onReset,
}: AuditLogToolbarProps) {
  return (
    <Box
      sx={{
        p: 2,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <TextField
        size="small"
        label="操作者 ID"
        type="number"
        value={filterOperatorId}
        onChange={(e) => {
          const v = e.target.value;
          onFilterOperatorId(v === '' ? '' : Number(v));
        }}
        sx={{ width: 130 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:user-bold" width={16} />
              </InputAdornment>
            ),
          },
        }}
      />

      <TextField
        size="small"
        label="目标用户 ID"
        type="number"
        value={filterTargetId}
        onChange={(e) => {
          const v = e.target.value;
          onFilterTargetId(v === '' ? '' : Number(v));
        }}
        sx={{ width: 130 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="solar:users-group-rounded-bold" width={16} />
              </InputAdornment>
            ),
          },
        }}
      />

      <TextField
        select
        size="small"
        label="操作类型"
        value={filterAction}
        onChange={(e) => onFilterAction(e.target.value as AuditAction | '')}
        sx={{ width: 140 }}
      >
        <MenuItem value="">全部</MenuItem>
        {(Object.keys(AUDIT_ACTION_LABEL) as AuditAction[]).map((key) => (
          <MenuItem key={key} value={key}>
            {AUDIT_ACTION_LABEL[key]}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        size="small"
        label="开始日期"
        type="date"
        value={startDate}
        onChange={(e) => onStartDate(e.target.value)}
        sx={{ width: 160 }}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <TextField
        size="small"
        label="结束日期"
        type="date"
        value={endDate}
        onChange={(e) => onEndDate(e.target.value)}
        sx={{ width: 160 }}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Button
        variant="contained"
        startIcon={<Iconify icon="solar:magnifer-bold" />}
        onClick={onSearch}
      >
        查询
      </Button>

      <Button
        variant="outlined"
        startIcon={<Iconify icon="solar:restart-bold" />}
        onClick={onReset}
      >
        重置
      </Button>
    </Box>
  );
}
