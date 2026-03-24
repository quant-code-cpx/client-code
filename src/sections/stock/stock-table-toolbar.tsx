import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
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

// ----------------------------------------------------------------------

export type StockFilters = {
  keyword: string;
  exchange: string;
  market: string;
  industry: string;
};

type StockTableToolbarProps = {
  filters: StockFilters;
  onFilterChange: (filters: Partial<StockFilters>) => void;
};

const EXCHANGES = ['全部', 'SSE', 'SZSE', 'BSE'];
const MARKETS = ['全部', '主板', '创业板', '科创板', '北交所'];
const INDUSTRIES = [
  '全部',
  '银行',
  '保险',
  '非银金融',
  '饮料',
  '食品饮料',
  '家用电器',
  '电气设备',
  '汽车',
  '医药',
  '电子',
  '半导体',
  '房地产',
  '电力',
];

export function StockTableToolbar({ filters, onFilterChange }: StockTableToolbarProps) {
  const [screenerAnchorEl, setScreenerAnchorEl] = useState<null | HTMLElement>(null);

  const activeFilters = [
    filters.exchange && filters.exchange !== '全部' ? `交易所: ${filters.exchange}` : '',
    filters.market && filters.market !== '全部' ? `板块: ${filters.market}` : '',
    filters.industry && filters.industry !== '全部' ? `行业: ${filters.industry}` : '',
  ].filter(Boolean);

  return (
    <Box sx={{ px: 2.5, py: 2 }}>
      <Toolbar disableGutters sx={{ gap: 1.5, flexWrap: 'wrap', height: 'auto', minHeight: 'auto' }}>
        <OutlinedInput
          size="small"
          value={filters.keyword}
          onChange={(e) => onFilterChange({ keyword: e.target.value })}
          placeholder="搜索股票代码 / 名称"
          startAdornment={
            <InputAdornment position="start">
              <Iconify width={18} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          }
          sx={{ maxWidth: 240 }}
        />

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>交易所</InputLabel>
          <Select
            label="交易所"
            value={filters.exchange || '全部'}
            onChange={(e) => onFilterChange({ exchange: e.target.value })}
          >
            {EXCHANGES.map((ex) => (
              <MenuItem key={ex} value={ex}>
                {ex}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>板块</InputLabel>
          <Select
            label="板块"
            value={filters.market || '全部'}
            onChange={(e) => onFilterChange({ market: e.target.value })}
          >
            {MARKETS.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>行业</InputLabel>
          <Select
            label="行业"
            value={filters.industry || '全部'}
            onChange={(e) => onFilterChange({ industry: e.target.value })}
          >
            {INDUSTRIES.map((ind) => (
              <MenuItem key={ind} value={ind}>
                {ind}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          startIcon={<Iconify icon="ic:round-filter-list" />}
          onClick={(e) => setScreenerAnchorEl(e.currentTarget)}
        >
          选股器
        </Button>

        <Menu
          anchorEl={screenerAnchorEl}
          open={Boolean(screenerAnchorEl)}
          onClose={() => setScreenerAnchorEl(null)}
        >
          <MenuItem disabled sx={{ typography: 'body2', color: 'text.secondary' }}>
            选股器功能即将上线
          </MenuItem>
        </Menu>
      </Toolbar>

      {activeFilters.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
          {activeFilters.map((label) => (
            <Chip key={label} label={label} size="small" variant="outlined" />
          ))}
        </Stack>
      )}
    </Box>
  );
}
