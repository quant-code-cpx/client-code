import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

import { STRATEGY_TYPE_OPTIONS } from './constants';

// ----------------------------------------------------------------------

export type StrategyListFilter = {
  strategyType: string;
  keyword: string;
  tags: string[];
};

interface StrategyListToolbarProps {
  filter: StrategyListFilter;
  allTags: string[];
  onFilterChange: (f: StrategyListFilter) => void;
}

export function StrategyListToolbar({ filter, allTags, onFilterChange }: StrategyListToolbarProps) {
  const [keywordInput, setKeywordInput] = useState(filter.keyword);

  // Debounce keyword changes
  const handleKeywordChange = useCallback(
    (value: string) => {
      setKeywordInput(value);
      clearTimeout((handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
      (handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t = setTimeout(
        () => {
          onFilterChange({ ...filter, keyword: value });
        },
        300
      );
    },
    [filter, onFilterChange]
  );

  return (
    <Box
      sx={{
        p: 2.5,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 2,
        alignItems: 'center',
      }}
    >
      {/* Strategy type */}
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel>策略类型</InputLabel>
        <Select
          label="策略类型"
          value={filter.strategyType}
          onChange={(e) => onFilterChange({ ...filter, strategyType: e.target.value })}
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
        onChange={(_, newVal) => onFilterChange({ ...filter, tags: newVal })}
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
    </Box>
  );
}
