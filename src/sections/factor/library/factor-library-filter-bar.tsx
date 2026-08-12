import type { FactorStatus, FactorSourceType } from 'src/api/factor';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

import { Iconify } from 'src/components/iconify';

import { STATUS_META, SOURCE_LABELS } from '../constants';

import type { SortKey, FactorLibraryFilters } from './hooks/use-factor-library-filters';

// ----------------------------------------------------------------------

type Props = {
  filters: FactorLibraryFilters;
  onChange: (patch: Partial<FactorLibraryFilters>) => void;
  onReset: () => void;
};

const SOURCE_OPTIONS: FactorSourceType[] = ['FIELD_REF', 'DERIVED', 'CUSTOM_SQL'];
const STATUS_OPTIONS: FactorStatus[] = ['FRESH', 'STALE', 'FAILED', 'NEVER', 'DISABLED'];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'ir', label: 'IR' },
  { value: 'ic10d', label: 'IC 10d' },
  { value: 'coverage', label: '覆盖度' },
  { value: 'lastComputeDate', label: '最近预计算' },
  { value: 'name', label: '字母序' },
];

export function FactorLibraryFilterBar({ filters, onChange, onReset }: Props) {
  const theme = useTheme();

  const toggleArrayValue = <T extends string>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const hasActive =
    filters.sourceTypes.length > 0 ||
    filters.statuses.length > 0 ||
    filters.icMin !== null ||
    filters.coverageMin !== null ||
    filters.search !== '' ||
    filters.sortBy !== 'ir' ||
    filters.sortOrder !== 'desc';

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        py: 1.5,
        px: 2,
        mb: 2,
        bgcolor: varAlpha(theme.vars.palette.background.defaultChannel, 0.95),
        backdropFilter: 'blur(6px)',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack
        role="group"
        aria-label="因子库筛选条件"
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        useFlexGap
        flexWrap="wrap"
        alignItems={{ md: 'center' }}
      >
        {/* 来源 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
            来源
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {SOURCE_OPTIONS.map((src) => {
              const active = filters.sourceTypes.includes(src);
              return (
                <Chip
                  key={src}
                  size="small"
                  label={SOURCE_LABELS[src]}
                  color={active ? 'primary' : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  onClick={() =>
                    onChange({ sourceTypes: toggleArrayValue(filters.sourceTypes, src) })
                  }
                />
              );
            })}
          </Stack>
        </Box>

        {/* 状态 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
            状态
          </Typography>
          <Stack direction="row" spacing={0.5}>
            {STATUS_OPTIONS.map((s) => {
              const active = filters.statuses.includes(s);
              const meta = STATUS_META[s];
              return (
                <Chip
                  key={s}
                  size="small"
                  label={meta.label}
                  color={active && meta.color !== 'default' ? meta.color : 'default'}
                  variant={active ? 'filled' : 'outlined'}
                  onClick={() => onChange({ statuses: toggleArrayValue(filters.statuses, s) })}
                />
              );
            })}
          </Stack>
        </Box>

        {/* IC ≥ */}
        <Box sx={{ minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
            IC 10d ≥ {filters.icMin === null ? '不限' : filters.icMin.toFixed(2)}
          </Typography>
          <Slider
            size="small"
            min={0}
            max={0.2}
            step={0.01}
            value={filters.icMin ?? 0}
            onChange={(_, v) => onChange({ icMin: typeof v === 'number' ? v : 0 })}
            onChangeCommitted={(_, v) =>
              onChange({ icMin: typeof v === 'number' && v > 0 ? v : null })
            }
          />
        </Box>

        {/* 覆盖度 ≥ */}
        <Box sx={{ minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>
            覆盖度 ≥{' '}
            {filters.coverageMin === null ? '不限' : `${(filters.coverageMin * 100).toFixed(0)}%`}
          </Typography>
          <Slider
            size="small"
            min={0}
            max={1}
            step={0.05}
            value={filters.coverageMin ?? 0}
            onChange={(_, v) => onChange({ coverageMin: typeof v === 'number' ? v : 0 })}
            onChangeCommitted={(_, v) =>
              onChange({ coverageMin: typeof v === 'number' && v > 0 ? v : null })
            }
          />
        </Box>

        {/* 收益周期 */}
        <FormControl size="small" sx={{ minWidth: 90 }}>
          <InputLabel sx={{ fontSize: 12 }}>周期</InputLabel>
          <Select
            label="周期"
            value={filters.icPeriod}
            onChange={(e) =>
              onChange({ icPeriod: e.target.value as FactorLibraryFilters['icPeriod'] })
            }
          >
            <MenuItem value="5d">5 日</MenuItem>
            <MenuItem value="10d">10 日</MenuItem>
            <MenuItem value="20d">20 日</MenuItem>
          </Select>
        </FormControl>

        {/* 排序 */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ fontSize: 12 }}>排序</InputLabel>
          <Select
            label="排序"
            value={filters.sortBy}
            onChange={(e) => onChange({ sortBy: e.target.value as SortKey })}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          size="small"
          variant="outlined"
          onClick={() => onChange({ sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc' })}
          startIcon={
            <Iconify
              icon={
                filters.sortOrder === 'desc'
                  ? 'solar:alt-arrow-down-bold'
                  : 'solar:alt-arrow-up-bold'
              }
              width={16}
            />
          }
        >
          {filters.sortOrder === 'desc' ? '降序' : '升序'}
        </Button>

        <Box sx={{ flex: 1 }} />

        {hasActive && (
          <Button size="small" color="inherit" onClick={onReset}>
            重置
          </Button>
        )}
      </Stack>
    </Box>
  );
}
