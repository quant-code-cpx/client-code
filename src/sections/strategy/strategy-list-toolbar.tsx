import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Switch from '@mui/material/Switch';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

import { STRATEGY_TYPE_OPTIONS } from './constants';

import type { StrategyListFilter } from './hooks/use-strategy-list-filters';

export type { StrategyListFilter };

// ----------------------------------------------------------------------

interface StrategyListToolbarProps {
  filter: StrategyListFilter;
  allTags: string[];
  isFiltered: boolean;
  onFilterChange: (patch: Partial<StrategyListFilter>) => void;
  onReset: () => void;
}

export function StrategyListToolbar({
  filter,
  allTags,
  isFiltered,
  onFilterChange,
  onReset,
}: StrategyListToolbarProps) {
  const [keywordInput, setKeywordInput] = useState(filter.keyword);
  const [perfAnchorEl, setPerfAnchorEl] = useState<HTMLElement | null>(null);

  // Debounce keyword changes
  const handleKeywordChange = useCallback(
    (value: string) => {
      setKeywordInput(value);
      clearTimeout((handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
      (handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t = setTimeout(
        () => {
          onFilterChange({ keyword: value });
        },
        300
      );
    },
    [onFilterChange]
  );

  const hasPerfFilter =
    Boolean(filter.minTotalReturn) || Boolean(filter.minSharpeRatio) || filter.hasActiveSignal;

  return (
    <Box sx={{ p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
      {/* View toggle: card / table */}
      <ToggleButtonGroup
        size="small"
        exclusive
        value={filter.view}
        onChange={(_, v) => {
          if (v) onFilterChange({ view: v as 'card' | 'table' });
        }}
      >
        <ToggleButton value="card">
          <Iconify icon="solar:widget-bold" width={18} />
        </ToggleButton>
        <ToggleButton value="table">
          <Iconify icon="solar:list-bold" width={18} />
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Strategy type */}
      <FormControl size="small" sx={{ minWidth: 160 }}>
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

      {/* Keyword search */}
      <TextField
        size="small"
        placeholder="搜索策略名称或描述"
        value={keywordInput}
        onChange={(e) => handleKeywordChange(e.target.value)}
        sx={{ minWidth: 220 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* Tag filter */}
      <Autocomplete
        multiple
        size="small"
        options={allTags}
        value={filter.tags}
        onChange={(_, newVal) => onFilterChange({ tags: newVal })}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return <Chip key={key} label={option} size="small" {...tagProps} />;
          })
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="标签过滤"
            placeholder={filter.tags.length === 0 ? '选择标签' : ''}
          />
        )}
        sx={{ minWidth: 200 }}
        noOptionsText="无可用标签"
      />

      {/* Performance filter button */}
      <Button
        size="small"
        variant={hasPerfFilter ? 'contained' : 'outlined'}
        startIcon={<Iconify icon="solar:filter-bold" width={16} />}
        onClick={(e) => setPerfAnchorEl(e.currentTarget)}
        color={hasPerfFilter ? 'primary' : 'inherit'}
      >
        业绩筛选
      </Button>

      <Popover
        open={Boolean(perfAnchorEl)}
        anchorEl={perfAnchorEl}
        onClose={() => setPerfAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, width: 260, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2">业绩筛选</Typography>
          <TextField
            size="small"
            label="近一次收益 ≥ (%)"
            type="number"
            value={filter.minTotalReturn}
            onChange={(e) => onFilterChange({ minTotalReturn: e.target.value })}
            placeholder="如 5 表示 +5%"
          />
          <TextField
            size="small"
            label="夏普比率 ≥"
            type="number"
            value={filter.minSharpeRatio}
            onChange={(e) => onFilterChange({ minSharpeRatio: e.target.value })}
            placeholder="如 1.0"
          />
          <FormControlLabel
            control={
              <Switch
                checked={filter.hasActiveSignal}
                onChange={(e) => onFilterChange({ hasActiveSignal: e.target.checked })}
                size="small"
              />
            }
            label="仅显示已激活信号"
          />
          {hasPerfFilter && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                onFilterChange({ minTotalReturn: '', minSharpeRatio: '', hasActiveSignal: false });
                setPerfAnchorEl(null);
              }}
            >
              清除
            </Button>
          )}
        </Box>
      </Popover>

      {/* Reset all filters */}
      {isFiltered && (
        <Button size="small" color="error" onClick={onReset} startIcon={<Iconify icon="solar:close-circle-bold" width={16} />}>
          重置
        </Button>
      )}
    </Box>
  );
}

