import type { Theme, SxProps } from '@mui/material/styles';
import type { EventType, ImpactLevel, CalendarScope } from 'src/api/alert';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

import { EVENT_TYPE_LIST } from './event-type-config';

import type { ViewMode, FilterPatch, FilterState } from './types';

// ----------------------------------------------------------------------

const SCOPE_OPTIONS: Array<{ value: CalendarScope; label: string; icon: string }> = [
  { value: 'ALL', label: '全市场', icon: 'solar:earth-bold' },
  { value: 'WATCHLIST', label: '自选股', icon: 'solar:star-bold' },
  { value: 'PORTFOLIO', label: '持仓组合', icon: 'solar:wallet-bold' },
];

const IMPACT_OPTIONS: Array<{ value: ImpactLevel; label: string; color: string }> = [
  { value: 'HIGH', label: '高', color: 'error.main' },
  { value: 'MEDIUM', label: '中', color: 'warning.main' },
  { value: 'LOW', label: '低', color: 'info.main' },
];

const MARKET_CAP_OPTIONS = [
  { value: 'LARGE', label: '大盘 (≥500亿)' },
  { value: 'MID', label: '中盘 (100-500亿)' },
  { value: 'SMALL', label: '小盘 (<100亿)' },
];

const QUICK_RANGES = [
  { label: '今天', days: 0 },
  { label: '本周', days: 6 },
  { label: '14天', days: 14 },
  { label: '30天', days: 30 },
];

const sxRoot: SxProps<Theme> = {
  p: 2,
  borderRadius: 2,
  bgcolor: 'background.neutral',
  mb: 2.5,
};

type Props = {
  filters: FilterState;
  onChange: (patch: FilterPatch) => void;
  onReset: () => void;
  onRefresh: () => void;
  onExport: () => void;
};

export function CalendarFilters({ filters, onChange, onReset, onRefresh, onExport }: Props) {
  const setQuickRange = (days: number) => {
    const today = dayjs();
    onChange({
      startDate: today.format('YYYYMMDD'),
      endDate: today.add(days, 'day').format('YYYYMMDD'),
    });
  };

  const toggleType = (type: EventType) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChange({ types: next });
  };

  const toggleImpact = (level: ImpactLevel) => {
    const next = filters.impactLevels.includes(level)
      ? filters.impactLevels.filter((l) => l !== level)
      : [...filters.impactLevels, level];
    onChange({ impactLevels: next });
  };

  return (
    <Box sx={sxRoot}>
      <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center" sx={{ mb: 1.5 }}>
        <DatePicker
          label="开始日期"
          value={filters.startDate ? dayjs(filters.startDate, 'YYYYMMDD') : null}
          onChange={(v) => onChange({ startDate: v?.format('YYYYMMDD') ?? '' })}
          format="YYYY-MM-DD"
          slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
        />
        <DatePicker
          label="结束日期"
          value={filters.endDate ? dayjs(filters.endDate, 'YYYYMMDD') : null}
          onChange={(v) => onChange({ endDate: v?.format('YYYYMMDD') ?? '' })}
          format="YYYY-MM-DD"
          slotProps={{ textField: { size: 'small', sx: { minWidth: 160 } } }}
        />
        <Stack direction="row" spacing={0.5}>
          {QUICK_RANGES.map((opt) => (
            <Button
              key={opt.label}
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => setQuickRange(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <ToggleButtonGroup
          value={filters.view}
          exclusive
          size="small"
          onChange={(_, v: ViewMode | null) => v && onChange({ view: v })}
        >
          <ToggleButton value="grid">
            <Iconify icon="solar:calendar-bold" width={18} sx={{ mr: 0.5 }} />
            月历
          </ToggleButton>
          <ToggleButton value="timeline">
            <Iconify icon="solar:layers-bold" width={18} sx={{ mr: 0.5 }} />
            时间线
          </ToggleButton>
          <ToggleButton value="table">
            <Iconify icon="solar:widget-bold" width={18} sx={{ mr: 0.5 }} />
            表格
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" sx={{ mb: 1.5 }}>
        <ToggleButtonGroup
          value={filters.scope}
          exclusive
          size="small"
          onChange={(_, v: CalendarScope | null) => v && onChange({ scope: v })}
        >
          {SCOPE_OPTIONS.map((opt) => (
            <ToggleButton key={opt.value} value={opt.value}>
              <Iconify icon={opt.icon as never} width={16} sx={{ mr: 0.5 }} />
              {opt.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <TextField
          select
          size="small"
          label="市值"
          value={filters.marketCapBuckets[0] ?? ''}
          onChange={(e) => onChange({ marketCapBuckets: e.target.value ? [e.target.value] : [] })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">全部市值</MenuItem>
          {MARKET_CAP_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          placeholder="搜索股票/标题"
          value={filters.keyword}
          onChange={(e) => onChange({ keyword: e.target.value })}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 200 }}
        />

        <Box sx={{ flexGrow: 1 }} />

        <Button
          size="small"
          variant="text"
          color="inherit"
          startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
          onClick={onRefresh}
        >
          刷新
        </Button>
        <Button
          size="small"
          variant="text"
          color="inherit"
          startIcon={<Iconify icon="solar:download-bold" width={16} />}
          onClick={onExport}
        >
          导出
        </Button>
        <Button size="small" variant="text" color="inherit" onClick={onReset}>
          重置
        </Button>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          类型：
        </Typography>
        {EVENT_TYPE_LIST.map((opt) => {
          const active = filters.types.includes(opt.value);
          return (
            <Chip
              key={opt.value}
              size="small"
              label={opt.label}
              icon={<Iconify icon={opt.icon} width={14} />}
              color={active ? opt.color : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => toggleType(opt.value)}
            />
          );
        })}
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          影响力：
        </Typography>
        {IMPACT_OPTIONS.map((opt) => {
          const active = filters.impactLevels.includes(opt.value);
          return (
            <Chip
              key={opt.value}
              size="small"
              label={opt.label}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => toggleImpact(opt.value)}
              sx={{
                ...(active && {
                  bgcolor: opt.color,
                  color: 'common.white',
                  '&:hover': { bgcolor: opt.color },
                }),
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
