import type { AreaItem, IndustryItem } from 'src/api/screener';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Autocomplete from '@mui/material/Autocomplete';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

import { StockColumnSettings } from './stock-column-settings';
import {
  IS_HS_LABEL,
  IS_HS_OPTIONS,
  MARKET_OPTIONS,
  EXCHANGE_LABEL,
  EXCHANGE_OPTIONS,
} from './constants';

import type { ColumnId, StockFilters } from './types';

// ----------------------------------------------------------------------

type StockTableToolbarProps = {
  filters: StockFilters;
  onFilterChange: (changed: Partial<StockFilters>) => void;
  onResetFilters: () => void;
  onOpenScreener: () => void;
  industries: IndustryItem[];
  areas: AreaItem[];
  visibleColumns: ColumnId[];
  onVisibleColumnsChange: (next: ColumnId[]) => void;
};

export function StockTableToolbar({
  filters,
  onFilterChange,
  onResetFilters,
  onOpenScreener,
  industries,
  areas,
  visibleColumns,
  onVisibleColumnsChange,
}: StockTableToolbarProps) {
  const [localKeyword, setLocalKeyword] = useState(filters.keyword);
  const isFirstRun = useRef(true);

  // 防抖：400ms 后才将关键词提交给父组件触发请求；首次挂载不重复请求
  useEffect(() => {
    if (isFirstRun.current === true) {
      isFirstRun.current = false;
      return undefined;
    }
    const timer = setTimeout(() => {
      onFilterChange({ keyword: localKeyword });
    }, 400);
    return () => clearTimeout(timer);
  }, [localKeyword, onFilterChange]);

  // 当父级 filters.keyword 通过「清空」被重置时，本地输入也跟随重置
  useEffect(() => {
    if (filters.keyword === '' && localKeyword !== '') {
      isFirstRun.current = true;
      setLocalKeyword('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.keyword]);

  const conditionChips: Array<{ key: string; label: string; onDelete: () => void }> = [];
  if (filters.exchange !== '') {
    conditionChips.push({
      key: 'exchange',
      label: `交易所：${EXCHANGE_LABEL[filters.exchange] ?? filters.exchange}`,
      onDelete: () => onFilterChange({ exchange: '' }),
    });
  }
  if (filters.market !== '') {
    conditionChips.push({
      key: 'market',
      label: `板块：${filters.market}`,
      onDelete: () => onFilterChange({ market: '' }),
    });
  }
  if (filters.isHs !== '') {
    conditionChips.push({
      key: 'isHs',
      label: `沪深港通：${IS_HS_LABEL[filters.isHs] ?? filters.isHs}`,
      onDelete: () => onFilterChange({ isHs: '' }),
    });
  }
  filters.industries.forEach((name) => {
    conditionChips.push({
      key: `industry-${name}`,
      label: `行业：${name}`,
      onDelete: () => onFilterChange({ industries: filters.industries.filter((n) => n !== name) }),
    });
  });
  filters.areas.forEach((name) => {
    conditionChips.push({
      key: `area-${name}`,
      label: `地域：${name}`,
      onDelete: () => onFilterChange({ areas: filters.areas.filter((n) => n !== name) }),
    });
  });
  if (filters.highLiquidity === true) {
    conditionChips.push({
      key: 'highLiquidity',
      label: '高流动性（成交额>1亿）',
      onDelete: () => onFilterChange({ highLiquidity: false }),
    });
  }
  if (filters.largeCap === true) {
    conditionChips.push({
      key: 'largeCap',
      label: '百亿以上',
      onDelete: () => onFilterChange({ largeCap: false }),
    });
  }
  if (filters.highDividend === true) {
    conditionChips.push({
      key: 'highDividend',
      label: '高股息（≥3%）',
      onDelete: () => onFilterChange({ highDividend: false }),
    });
  }

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

        {/* 沪深港通 */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>沪深港通</InputLabel>
          <Select
            label="沪深港通"
            value={filters.isHs}
            onChange={(e) => onFilterChange({ isHs: e.target.value })}
          >
            {IS_HS_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* 行业（多选） */}
        <Autocomplete
          multiple
          size="small"
          disableCloseOnSelect
          options={industries.map((it) => it.name)}
          getOptionLabel={(opt) => opt}
          value={filters.industries}
          onChange={(_, value) => onFilterChange({ industries: value })}
          renderOption={(props, option) => {
            const target = industries.find((it) => it.name === option);
            return (
              <li {...props} key={option}>
                <Box
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{option}</span>
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {target ? target.count : ''}
                  </Box>
                </Box>
              </li>
            );
          }}
          renderInput={(params) => <TextField {...params} label="行业" placeholder="多选" />}
          sx={{ minWidth: 200 }}
        />

        {/* 地域（多选） */}
        <Autocomplete
          multiple
          size="small"
          disableCloseOnSelect
          options={areas.map((it) => it.name)}
          getOptionLabel={(opt) => opt}
          value={filters.areas}
          onChange={(_, value) => onFilterChange({ areas: value })}
          renderOption={(props, option) => {
            const target = areas.find((it) => it.name === option);
            return (
              <li {...props} key={option}>
                <Box
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{option}</span>
                  <Box component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {target ? target.count : ''}
                  </Box>
                </Box>
              </li>
            );
          }}
          renderInput={(params) => <TextField {...params} label="地域" placeholder="多选" />}
          sx={{ minWidth: 180 }}
        />

        <Box sx={{ flexGrow: 1 }} />

        <StockColumnSettings visibleColumns={visibleColumns} onChange={onVisibleColumnsChange} />

        <Button
          variant="outlined"
          startIcon={<Iconify icon="ic:round-filter-list" />}
          onClick={onOpenScreener}
        >
          选股器
        </Button>
      </Toolbar>

      {/* 第二行：快捷条件 + 已选条件 chips + 一键清空 */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
      >
        <Chip
          label="高流动性"
          size="small"
          variant={filters.highLiquidity === true ? 'filled' : 'outlined'}
          color={filters.highLiquidity === true ? 'primary' : 'default'}
          onClick={() => onFilterChange({ highLiquidity: !filters.highLiquidity })}
        />
        <Chip
          label="百亿以上"
          size="small"
          variant={filters.largeCap === true ? 'filled' : 'outlined'}
          color={filters.largeCap === true ? 'primary' : 'default'}
          onClick={() => onFilterChange({ largeCap: !filters.largeCap })}
        />
        <Chip
          label="高股息"
          size="small"
          variant={filters.highDividend === true ? 'filled' : 'outlined'}
          color={filters.highDividend === true ? 'primary' : 'default'}
          onClick={() => onFilterChange({ highDividend: !filters.highDividend })}
        />

        {conditionChips.length > 0 && (
          <>
            <Box sx={{ width: '1px', height: 20, bgcolor: 'divider', mx: 0.5 }} />
            {conditionChips.map((c) => (
              <Chip
                key={c.key}
                label={c.label}
                size="small"
                variant="outlined"
                onDelete={c.onDelete}
              />
            ))}
            <Button
              size="small"
              color="inherit"
              startIcon={<Iconify icon="solar:close-circle-bold" width={14} />}
              onClick={onResetFilters}
            >
              清空全部
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
