import type { FactorCategory, PrecomputeStatusItem } from 'src/api/factor';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

import { SOURCE_LABELS, CATEGORY_LABELS, FACTOR_CATEGORIES } from '../constants';

// ─── Types ────────────────────────────────────────────────────

export type AdminStatusFilters = {
  search: string;
  statuses: string[];
  categories: FactorCategory[];
  sources: string[];
};

export const DEFAULT_ADMIN_FILTERS: AdminStatusFilters = {
  search: '',
  statuses: [],
  categories: [],
  sources: [],
};

type Props = {
  filters: AdminStatusFilters;
  onChange: (next: AdminStatusFilters) => void;
};

const STATUS_OPTIONS = [
  { value: 'UP_TO_DATE', label: '最新' },
  { value: 'STALE', label: '滞后' },
  { value: 'FAILED', label: '失败' },
  { value: 'NEVER', label: '未计算' },
  { value: 'RUNNING', label: '进行中' },
];

const SOURCE_OPTIONS = Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label }));

export function FactorAdminFilterBar({ filters, onChange }: Props) {
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleToggleStatus = (val: string) => {
    const next = filters.statuses.includes(val)
      ? filters.statuses.filter((s) => s !== val)
      : [...filters.statuses, val];
    onChange({ ...filters, statuses: next });
  };

  const handleCategoryChange = (_: unknown, val: FactorCategory[]) => {
    onChange({ ...filters, categories: val });
  };

  const handleSourceChange = (_: unknown, val: string[]) => {
    onChange({ ...filters, sources: val });
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="搜索因子标识 / 名称..."
          value={filters.search}
          onChange={handleSearch}
          sx={{ width: 240 }}
        />

        <Autocomplete
          multiple
          size="small"
          options={FACTOR_CATEGORIES}
          getOptionLabel={(cat) => CATEGORY_LABELS[cat] ?? cat}
          value={filters.categories}
          onChange={handleCategoryChange}
          renderInput={(params) => <TextField {...params} label="分类" />}
          sx={{ width: 220 }}
          disableCloseOnSelect
        />

        <Autocomplete
          multiple
          size="small"
          options={SOURCE_OPTIONS.map((o) => o.value)}
          getOptionLabel={(v) => SOURCE_LABELS[v as keyof typeof SOURCE_LABELS] ?? v}
          value={filters.sources}
          onChange={handleSourceChange}
          renderInput={(params) => <TextField {...params} label="来源" />}
          sx={{ width: 180 }}
          disableCloseOnSelect
        />
      </Stack>

      {/* Status quick-filter chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {STATUS_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            size="small"
            variant={filters.statuses.includes(opt.value) ? 'filled' : 'outlined'}
            color={filters.statuses.includes(opt.value) ? 'primary' : 'default'}
            onClick={() => handleToggleStatus(opt.value)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
        {(filters.statuses.length > 0 ||
          filters.categories.length > 0 ||
          filters.sources.length > 0 ||
          filters.search) && (
          <Chip
            label="清除筛选"
            size="small"
            variant="outlined"
            color="error"
            onClick={() => onChange(DEFAULT_ADMIN_FILTERS)}
            sx={{ cursor: 'pointer' }}
          />
        )}
      </Stack>
    </Stack>
  );
}

// ─── Filter function ──────────────────────────────────────────

export function applyAdminFilters(
  items: PrecomputeStatusItem[],
  filters: AdminStatusFilters
): PrecomputeStatusItem[] {
  let result = items;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (it) => it.factorName.toLowerCase().includes(q) || it.factorLabel.toLowerCase().includes(q)
    );
  }

  if (filters.statuses.length > 0) {
    result = result.filter((it) => filters.statuses.includes(it.status));
  }

  if (filters.categories.length > 0) {
    result = result.filter((it) => it.category && filters.categories.includes(it.category));
  }

  if (filters.sources.length > 0) {
    result = result.filter((it) => it.sourceType && filters.sources.includes(it.sourceType));
  }

  return result;
}
