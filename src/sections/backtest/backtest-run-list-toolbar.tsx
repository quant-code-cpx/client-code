import dayjs from 'dayjs';
import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { Iconify } from 'src/components/iconify';

import { STATUS_OPTIONS, STRATEGY_TYPE_OPTIONS } from './constants';
import { isInvalidDateRange, countActiveRunFilters } from './hooks/use-backtest-run-list-state';

import type { RunListFilter } from './hooks/use-backtest-run-list-state';

// ----------------------------------------------------------------------

interface BacktestRunListToolbarProps {
  filter: RunListFilter;
  onFilterChange: (patch: Partial<RunListFilter>) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  loading: boolean;
}

const ARCHIVE_OPTIONS = [
  { label: '活跃任务', value: 'active' },
  { label: '已归档', value: 'archived' },
  { label: '全部', value: 'all' },
] as const;

function toDateValue(value: string) {
  return value ? dayjs(value) : null;
}

export function BacktestRunListToolbar({
  filter,
  onFilterChange,
  onClearFilters,
  onRefresh,
  loading,
}: BacktestRunListToolbarProps) {
  const activeCount = countActiveRunFilters(filter);
  const invalidDateRange = isInvalidDateRange(filter);

  const dateShortcuts = useMemo(
    () => [
      { label: '近 7 天', days: 7 },
      { label: '近 30 天', days: 30 },
      { label: '近季度', days: 90 },
    ],
    []
  );

  const applyRecentDays = (days: number) => {
    const end = dayjs();
    onFilterChange({
      startDate: end.subtract(days, 'day').format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
    });
  };

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
          onChange={(e) => onFilterChange({ status: e.target.value })}
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
          onChange={(e) => onFilterChange({ strategyType: e.target.value })}
        >
          {STRATEGY_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>归档</InputLabel>
        <Select
          label="归档"
          value={filter.archived}
          onChange={(e) =>
            onFilterChange({ archived: e.target.value as RunListFilter['archived'] })
          }
        >
          {ARCHIVE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Tooltip title="等待后端 tags/list 与 runs/list tagIds 支持">
        <Box component="span">
          <Button
            size="small"
            variant="outlined"
            disabled
            startIcon={<Iconify icon="solar:tag-bold" width={16} />}
            sx={{ height: 40 }}
          >
            标签
          </Button>
        </Box>
      </Tooltip>

      <TextField
        label="关键词搜索"
        size="small"
        value={filter.keyword}
        onChange={(e) => onFilterChange({ keyword: e.target.value })}
        placeholder="任务名称 / runId / 备注…"
        sx={{ minWidth: 200 }}
      />

      <DatePicker
        label="开始日期"
        value={toDateValue(filter.startDate)}
        onChange={(value) => onFilterChange({ startDate: value?.format('YYYY-MM-DD') ?? '' })}
        format="YYYY-MM-DD"
        slotProps={{
          textField: {
            size: 'small',
            error: invalidDateRange,
            helperText: invalidDateRange ? '开始不能晚于结束' : undefined,
          },
          field: { clearable: true },
        }}
        sx={{ width: 170 }}
      />

      <DatePicker
        label="结束日期"
        value={toDateValue(filter.endDate)}
        onChange={(value) => onFilterChange({ endDate: value?.format('YYYY-MM-DD') ?? '' })}
        format="YYYY-MM-DD"
        slotProps={{
          textField: {
            size: 'small',
            error: invalidDateRange,
          },
          field: { clearable: true },
        }}
        sx={{ width: 170 }}
      />

      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
        {dateShortcuts.map((item) => (
          <Button
            key={item.days}
            size="small"
            variant="text"
            onClick={() => applyRecentDays(item.days)}
          >
            {item.label}
          </Button>
        ))}
        <Button
          size="small"
          variant="text"
          onClick={() => onFilterChange({ startDate: '', endDate: '' })}
        >
          全部时间
        </Button>
      </Box>

      <Box sx={{ flex: 1 }} />

      {activeCount > 0 && (
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`已应用 ${activeCount} 个筛选`}
          onDelete={onClearFilters}
          deleteIcon={<Iconify icon="solar:close-circle-bold" />}
        />
      )}

      {invalidDateRange && (
        <Typography variant="caption" sx={{ color: 'error.main' }}>
          日期范围无效，已暂停请求
        </Typography>
      )}

      <Button
        variant="outlined"
        size="small"
        onClick={onRefresh}
        disabled={loading || invalidDateRange}
        startIcon={<Iconify icon="solar:refresh-bold" />}
      >
        刷新
      </Button>
    </Toolbar>
  );
}
