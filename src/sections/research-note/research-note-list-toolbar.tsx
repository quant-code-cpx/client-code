import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

// ----------------------------------------------------------------------

export type NoteListFilters = {
  tags: string[];
  tsCode: string;
  keyword: string;
  sortBy: 'updatedAt' | 'createdAt';
};

type Props = {
  availableTags: string[];
  filters: NoteListFilters;
  onFilterChange: (filters: NoteListFilters) => void;
  onSearch: () => void;
};

export function ResearchNoteListToolbar({
  availableTags,
  filters,
  onFilterChange,
  onSearch,
}: Props) {
  const handleChange = <K extends keyof NoteListFilters>(key: K, value: NoteListFilters[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <Box sx={{ px: 2.5, py: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
        {/* Keyword search */}
        <TextField
          size="small"
          label="关键词搜索"
          value={filters.keyword}
          onChange={(e) => handleChange('keyword', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          sx={{ minWidth: 180 }}
        />

        {/* Stock code filter */}
        <TextField
          size="small"
          label="股票代码"
          value={filters.tsCode}
          onChange={(e) => handleChange('tsCode', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          sx={{ minWidth: 140 }}
        />

        {/* Tag filter */}
        <Autocomplete
          multiple
          size="small"
          options={availableTags}
          value={filters.tags}
          onChange={(_, value) => {
            handleChange('tags', value);
            onSearch();
          }}
          renderInput={(params) => <TextField {...params} label="标签筛选" />}
          sx={{ minWidth: 200 }}
        />

        {/* Sort select */}
        <TextField
          select
          size="small"
          label="排序"
          value={filters.sortBy}
          onChange={(e) => {
            handleChange('sortBy', e.target.value as NoteListFilters['sortBy']);
            onSearch();
          }}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="updatedAt">更新时间</MenuItem>
          <MenuItem value="createdAt">创建时间</MenuItem>
        </TextField>
      </Stack>
    </Box>
  );
}
