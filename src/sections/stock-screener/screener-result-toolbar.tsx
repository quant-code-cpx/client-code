import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

import { SORT_OPTIONS } from './constants';

// ----------------------------------------------------------------------

type ScreenerResultToolbarProps = {
  total: number;
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
};

// ----------------------------------------------------------------------

export function ScreenerResultToolbar({
  total,
  loading,
  sortBy,
  sortOrder,
  onSortChange,
}: ScreenerResultToolbarProps) {
  return (
    <Box>
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          共命中{' '}
          <Typography component="span" variant="subtitle2" sx={{ color: 'text.primary' }}>
            {total}
          </Typography>{' '}
          只股票
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', flexShrink: 0 }}>
            排序：
          </Typography>
          <Select
            size="small"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value, sortOrder)}
            sx={{ minWidth: 120 }}
          >
            {SORT_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={sortOrder}
            onChange={(_, val) => {
              if (val) onSortChange(sortBy, val as 'asc' | 'desc');
            }}
          >
            <ToggleButton value="desc">
              <Iconify icon="eva:arrow-ios-downward-fill" width={16} />
            </ToggleButton>
            <ToggleButton value="asc">
              <Iconify icon="eva:arrow-ios-upward-fill" width={16} />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {loading && <LinearProgress />}
    </Box>
  );
}
