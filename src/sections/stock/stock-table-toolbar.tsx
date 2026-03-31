import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Toolbar from '@mui/material/Toolbar';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

import { MARKET_OPTIONS, EXCHANGE_OPTIONS } from './constants';

import type { StockFilters } from './types';

// ----------------------------------------------------------------------

type StockTableToolbarProps = {
  filters: StockFilters;
  onFilterChange: (changed: Partial<StockFilters>) => void;
  onOpenScreener: () => void;
};

export function StockTableToolbar({
  filters,
  onFilterChange,
  onOpenScreener,
}: StockTableToolbarProps) {
  const [localKeyword, setLocalKeyword] = useState(filters.keyword);

  // 防抖：400ms 后才将关键词提交给父组件触发请求
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({ keyword: localKeyword });
    }, 400);
    return () => clearTimeout(timer);
  }, [localKeyword, onFilterChange]);

  const activeChips = [
    filters.exchange
      ? `交易所: ${EXCHANGE_OPTIONS.find((o) => o.value === filters.exchange)?.label ?? filters.exchange}`
      : '',
    filters.market ? `板块: ${filters.market}` : '',
    filters.industry ? `行业: ${filters.industry}` : '',
    filters.area ? `地区: ${filters.area}` : '',
  ].filter(Boolean);

  return (
    <Box sx={{ px: 2.5, py: 2 }}>
      <Toolbar
        disableGutters
        sx={{ gap: 1.5, flexWrap: 'wrap', height: 'auto', minHeight: 'auto' }}
      >
        {/* 关键词搜索 */}
        <OutlinedInput
          size="small"
          value={localKeyword}
          onChange={(e) => setLocalKeyword(e.target.value)}
          placeholder="搜索代码 / 名称 / 拼音"
          startAdornment={
            <InputAdornment position="start">
              <Iconify width={18} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          sx={{ maxWidth: 240 }}
        />

        {/* 交易所 */}
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>交易所</InputLabel>
          <Select
            label="交易所"
            value={filters.exchange}
            onChange={(e) => onFilterChange({ exchange: e.target.value })}
          >
            {EXCHANGE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 板块 */}
        <FormControl size="small" sx={{ minWidth: 105 }}>
          <InputLabel>板块</InputLabel>
          <Select
            label="板块"
            value={filters.market}
            onChange={(e) => onFilterChange({ market: e.target.value })}
          >
            {MARKET_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 行业（后端模糊匹配，文本输入） */}
        <OutlinedInput
          size="small"
          value={filters.industry}
          onChange={(e) => onFilterChange({ industry: e.target.value })}
          placeholder="行业（如：银行）"
          sx={{ maxWidth: 140 }}
        />

        {/* 地区（后端模糊匹配，文本输入） */}
        <OutlinedInput
          size="small"
          value={filters.area}
          onChange={(e) => onFilterChange({ area: e.target.value })}
          placeholder="省份/地区"
          sx={{ maxWidth: 120 }}
        />

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          startIcon={<Iconify icon="ic:round-filter-list" />}
          onClick={onOpenScreener}
        >
          选股器
        </Button>
      </Toolbar>

      {activeChips.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          {activeChips.map((label) => (
            <Chip key={label} label={label} size="small" variant="outlined" />
          ))}
        </Stack>
      )}
    </Box>
  );
}
