import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Popover from '@mui/material/Popover';
import Divider from '@mui/material/Divider';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';

import { Iconify } from 'src/components/iconify';

import { COLUMN_LABEL, ALL_COLUMN_IDS, DEFAULT_VISIBLE_COLUMNS } from './constants';

import type { ColumnId } from './types';

// ----------------------------------------------------------------------

type StockColumnSettingsProps = {
  visibleColumns: ColumnId[];
  onChange: (next: ColumnId[]) => void;
};

export function StockColumnSettings({ visibleColumns, onChange }: StockColumnSettingsProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleToggle = (id: ColumnId) => {
    if (visibleColumns.includes(id)) {
      onChange(visibleColumns.filter((c) => c !== id));
    } else {
      // 保持 ALL_COLUMN_IDS 中的顺序
      const next = ALL_COLUMN_IDS.filter((c) => c === id || visibleColumns.includes(c));
      onChange([...next]);
    }
  };

  const handleReset = () => onChange([...DEFAULT_VISIBLE_COLUMNS]);

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Iconify icon="solar:settings-bold-duotone" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      >
        列配置
      </Button>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 240, p: 1.5 } } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 1, mb: 0.5 }}
        >
          <Typography variant="subtitle2">显示的列</Typography>
          <Button size="small" onClick={handleReset}>
            重置
          </Button>
        </Stack>

        <Divider sx={{ mb: 1 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {ALL_COLUMN_IDS.map((id) => (
            <FormControlLabel
              key={id}
              control={
                <Checkbox
                  size="small"
                  checked={visibleColumns.includes(id)}
                  onChange={() => handleToggle(id)}
                />
              }
              label={<Typography variant="body2">{COLUMN_LABEL[id]}</Typography>}
              sx={{ mx: 0, py: 0.25 }}
            />
          ))}
        </Box>
      </Popover>
    </>
  );
}
