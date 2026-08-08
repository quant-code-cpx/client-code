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
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { createCalendarDateRange } from './types';
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
  { label: '今天', days: 1 },
  { label: '未来一周', days: 7 },
  { label: '14天', days: 14 },
  { label: '30天', days: 30 },
] as const;

const sxRoot: SxProps<Theme> = {
  p: 2,
  borderRadius: 2,
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'divider',
  mb: 2.5,
};

type Props = {
  filters: FilterState;
  onChange: (patch: FilterPatch) => void;
  onReset: () => void;
  onRefresh: () => void;
};

export function CalendarFilters({ filters, onChange, onReset, onRefresh }: Props) {
  const setQuickRange = (days: 1 | 7 | 14 | 30) => onChange(createCalendarDateRange(days));

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
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(0, 1fr) auto',
            lg: 'auto auto minmax(16px, 1fr) auto',
          },
          gap: 1.5,
          alignItems: 'center',
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          role="group"
          aria-label="日期范围"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
            gap: 1,
            minWidth: { lg: 344 },
          }}
        >
          <DatePicker
            label="开始日期"
            value={filters.startDate ? dayjs(filters.startDate, 'YYYYMMDD') : null}
            onChange={(value) => onChange({ startDate: value?.format('YYYYMMDD') ?? '' })}
            sx={{ width: '100%' }}
          />
          <DatePicker
            label="结束日期"
            value={filters.endDate ? dayjs(filters.endDate, 'YYYYMMDD') : null}
            onChange={(value) => onChange({ endDate: value?.format('YYYYMMDD') ?? '' })}
            sx={{ width: '100%' }}
          />
        </Box>

        <Stack
          role="group"
          aria-label="快捷日期范围"
          direction="row"
          spacing={0.5}
          sx={{ overflowX: 'auto', pb: 0.25 }}
        >
          {QUICK_RANGES.map((opt) => (
            <Button
              key={opt.label}
              size="small"
              variant={
                filters.startDate === createCalendarDateRange(opt.days).startDate &&
                filters.endDate === createCalendarDateRange(opt.days).endDate
                  ? 'contained'
                  : 'outlined'
              }
              onClick={() => setQuickRange(opt.days)}
              sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {opt.label}
            </Button>
          ))}
        </Stack>

        <Box sx={{ display: { xs: 'none', lg: 'block' } }} />

        <Box
          sx={{
            overflowX: 'auto',
            justifySelf: { xs: 'stretch', md: 'end' },
            gridColumn: { xs: '1', md: '1 / -1', lg: 'auto' },
          }}
        >
          <ToggleButtonGroup
            aria-label="事件视图"
            value={filters.view}
            exclusive
            size="small"
            onChange={(_, value: ViewMode | null) => value && onChange({ view: value })}
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
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            sm: 'minmax(0, 1fr) auto',
            lg: 'auto 168px minmax(220px, 1fr) auto',
          },
          gap: 1,
          alignItems: 'center',
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ overflowX: 'auto' }}>
          <ToggleButtonGroup
            aria-label="事件范围"
            value={filters.scope}
            exclusive
            size="small"
            onChange={(_, value: CalendarScope | null) => value && onChange({ scope: value })}
          >
            {SCOPE_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value} sx={{ whiteSpace: 'nowrap' }}>
                <Iconify icon={opt.icon as never} width={16} sx={{ mr: 0.5 }} />
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <TextField
          select
          size="small"
          label="市值"
          value={filters.marketCapBuckets[0] ?? ''}
          onChange={(event) =>
            onChange({ marketCapBuckets: event.target.value ? [event.target.value] : [] })
          }
          sx={{ minWidth: 0 }}
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
          onChange={(event) => onChange({ keyword: event.target.value })}
          slotProps={{
            htmlInput: {
              name: 'calendarKeyword',
              autoComplete: 'off',
              'aria-label': '搜索股票或标题',
            },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 0, gridColumn: { xs: '1', sm: '1 / -1', lg: 'auto' } }}
        />

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ justifySelf: { xs: 'stretch', sm: 'end' } }}
        >
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
            onClick={onRefresh}
          >
            刷新
          </Button>
          <Button size="small" variant="text" color="inherit" onClick={onReset}>
            重置
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) auto' },
          gap: 1.5,
          alignItems: 'start',
          pt: 1.5,
        }}
      >
        <Stack
          role="group"
          aria-label="事件类型"
          direction="row"
          alignItems="center"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
        >
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
                aria-pressed={active}
                onClick={() => toggleType(opt.value)}
              />
            );
          })}
        </Stack>

        <Stack
          role="group"
          aria-label="事件影响力"
          direction="row"
          alignItems="center"
          spacing={1}
          useFlexGap
          flexWrap="wrap"
        >
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
                aria-pressed={active}
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
    </Box>
  );
}
