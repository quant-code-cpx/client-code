import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type WatchlistStockToolbarProps = {
  selectedCount: number;
  onAdd: () => void;
  onBatchImport: () => void;
  onBatchRemove: () => void;
  search: string;
  onSearchChange: (value: string) => void;
};

export function WatchlistStockToolbar({
  selectedCount,
  onAdd,
  onBatchImport,
  onBatchRemove,
  search,
  onSearchChange,
}: WatchlistStockToolbarProps) {
  return (
    <Toolbar
      sx={{
        px: 3,
        py: 2,
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        minHeight: 'unset !important',
      }}
    >
      <Button
        variant="contained"
        size="small"
        startIcon={<Iconify icon="solar:add-circle-bold" width={16} />}
        onClick={onAdd}
      >
        添加股票
      </Button>

      <Button
        variant="outlined"
        size="small"
        startIcon={<Iconify icon="solar:import-bold" width={16} />}
        onClick={onBatchImport}
      >
        批量导入
      </Button>

      {selectedCount > 0 && (
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={16} />}
          onClick={onBatchRemove}
        >
          批量删除 ({selectedCount})
        </Button>
      )}

      <Box sx={{ flexGrow: 1 }} />

      <TextField
        size="small"
        placeholder="搜索股票代码..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ width: 220 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" width={16} />
              </InputAdornment>
            ),
          },
        }}
      />
    </Toolbar>
  );
}
