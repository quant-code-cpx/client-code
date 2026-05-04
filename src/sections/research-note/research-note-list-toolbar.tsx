import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export type DateRangeKey = '' | 'today' | '7d' | '30d' | 'month';
export type ViewMode = 'card' | 'table';

export type NoteListFilters = {
  tags: string[];
  tsCode: string;
  keyword: string;
  sortBy: 'updatedAt' | 'createdAt';
  dateRange: DateRangeKey;
  pinnedOnly: boolean;
  hasStock: boolean;
};

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeKey; label: string }> = [
  { value: 'today', label: '今天' },
  { value: '7d', label: '7 天' },
  { value: '30d', label: '30 天' },
  { value: 'month', label: '本月' },
];

type Props = {
  availableTags: string[];
  filters: NoteListFilters;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onFilterChange: (filters: NoteListFilters) => void;
  onSearch: () => void;
  onResetFilters: () => void;
  onOpenTrash?: () => void;
  trashDisabled?: boolean;
};

export function ResearchNoteListToolbar({
  availableTags,
  filters,
  viewMode,
  onViewModeChange,
  onFilterChange,
  onSearch,
  onResetFilters,
  onOpenTrash,
  trashDisabled = true,
}: Props) {
  const handleChange = <K extends keyof NoteListFilters>(key: K, value: NoteListFilters[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const toggleDateRange = (value: DateRangeKey) => {
    handleChange('dateRange', filters.dateRange === value ? '' : value);
  };

  const hasAnyFilter =
    filters.tags.length > 0 ||
    filters.tsCode.length > 0 ||
    filters.keyword.length > 0 ||
    filters.dateRange !== '' ||
    filters.pinnedOnly ||
    filters.hasStock;

  return (
    <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* 第一行：快速筛选 + 视图模式 + 回收站 */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ rowGap: 1 }}>
        {DATE_RANGE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            size="small"
            color={filters.dateRange === opt.value ? 'primary' : 'default'}
            variant={filters.dateRange === opt.value ? 'filled' : 'outlined'}
            onClick={() => toggleDateRange(opt.value)}
          />
        ))}
        <Chip
          label="已置顶"
          size="small"
          icon={<Iconify icon="solar:pin-bold" width={14} />}
          color={filters.pinnedOnly ? 'warning' : 'default'}
          variant={filters.pinnedOnly ? 'filled' : 'outlined'}
          onClick={() => handleChange('pinnedOnly', !filters.pinnedOnly)}
        />
        <Chip
          label="已关联个股"
          size="small"
          icon={<Iconify icon="solar:share-bold" width={14} />}
          color={filters.hasStock ? 'info' : 'default'}
          variant={filters.hasStock ? 'filled' : 'outlined'}
          onClick={() => handleChange('hasStock', !filters.hasStock)}
        />

        {hasAnyFilter && (
          <Tooltip title="清空所有筛选" arrow>
            <IconButton size="small" onClick={onResetFilters}>
              <Iconify icon="solar:refresh-bold" width={16} />
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Tooltip title={trashDisabled ? '回收站功能即将上线（待后端就绪）' : '打开回收站'} arrow>
          <span>
            <IconButton size="small" onClick={onOpenTrash} disabled={trashDisabled}>
              <Iconify icon="solar:trash-bin-trash-bold" width={16} />
            </IconButton>
          </span>
        </Tooltip>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={viewMode}
          onChange={(_, v: ViewMode | null) => v && onViewModeChange(v)}
        >
          <ToggleButton value="card">
            <Tooltip title="卡片视图" arrow>
              <Iconify icon="solar:widget-bold" width={16} />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="table">
            <Tooltip title="表格视图" arrow>
              <Iconify icon="solar:menu-dots-bold" width={16} />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* 第二行：搜索 / 标签 / 股票 / 排序 */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="搜索标题或正文 (⌘K)"
          value={filters.keyword}
          onChange={(e) => handleChange('keyword', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="solar:magnifier-bold" width={16} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 240, flexGrow: 1 }}
        />

        <Autocomplete
          multiple
          size="small"
          options={availableTags}
          value={filters.tags}
          onChange={(_, value) => {
            handleChange('tags', value);
          }}
          renderInput={(params) => <TextField {...params} placeholder="标签筛选" />}
          sx={{ minWidth: 220 }}
        />

        <TextField
          size="small"
          placeholder="股票代码"
          value={filters.tsCode}
          onChange={(e) => handleChange('tsCode', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          sx={{ minWidth: 140 }}
        />

        <TextField
          select
          size="small"
          label="排序"
          value={filters.sortBy}
          onChange={(e) => handleChange('sortBy', e.target.value as NoteListFilters['sortBy'])}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="updatedAt">最近更新</MenuItem>
          <MenuItem value="createdAt">最近创建</MenuItem>
        </TextField>
      </Stack>
    </Box>
  );
}
