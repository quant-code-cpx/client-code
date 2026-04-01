import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

import { STATUS_OPTIONS, STRATEGY_TYPE_OPTIONS } from './constants';

// ----------------------------------------------------------------------

export type RunListFilter = {
  status: string;
  strategyType: string;
  keyword: string;
  dateRange: '7d' | '30d' | 'all';
};

interface BacktestRunListToolbarProps {
  filter: RunListFilter;
  onFilterChange: (f: RunListFilter) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function BacktestRunListToolbar({
  filter,
  onFilterChange,
  onRefresh,
  loading,
}: BacktestRunListToolbarProps) {
  const set = (patch: Partial<RunListFilter>) => onFilterChange({ ...filter, ...patch });

  return (
    <Toolbar
      sx={{
        py: 2,
        px: 3,
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        minHeight: 'unset !important',
      }}
    >
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel>状态</InputLabel>
        <Select
          label="状态"
          value={filter.status}
          onChange={(e) => set({ status: e.target.value })}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel>策略类型</InputLabel>
        <Select
          label="策略类型"
          value={filter.strategyType}
          onChange={(e) => set({ strategyType: e.target.value })}
        >
          {STRATEGY_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="关键词搜索"
        size="small"
        value={filter.keyword}
        onChange={(e) => set({ keyword: e.target.value })}
        placeholder="搜索任务名称"
        sx={{ minWidth: 160 }}
      />

      <ToggleButtonGroup
        value={filter.dateRange}
        exclusive
        size="small"
        onChange={(_, v) => {
          if (v) set({ dateRange: v as '7d' | '30d' | 'all' });
        }}
      >
        <ToggleButton value="7d" sx={{ px: 2 }}>
          近7天
        </ToggleButton>
        <ToggleButton value="30d" sx={{ px: 2 }}>
          近30天
        </ToggleButton>
        <ToggleButton value="all" sx={{ px: 2 }}>
          全部
        </ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ flex: 1 }} />

      <Button
        variant="outlined"
        size="small"
        onClick={onRefresh}
        disabled={loading}
        startIcon={<Iconify icon="solar:refresh-bold" />}
      >
        刷新
      </Button>
    </Toolbar>
  );
}
