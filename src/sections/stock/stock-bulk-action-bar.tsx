import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type StockBulkActionBarProps = {
  selectedCount: number;
  onAddToWatchlist: () => void;
  onClear: () => void;
};

export function StockBulkActionBar({
  selectedCount,
  onAddToWatchlist,
  onClear,
}: StockBulkActionBarProps) {
  const theme = useTheme();

  if (selectedCount <= 0) return null;

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
        borderTop: `1px dashed ${theme.vars.palette.divider}`,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
        已选 {selectedCount} 只
      </Typography>

      <Box sx={{ flexGrow: 1 }} />

      <Stack direction="row" spacing={1.25}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Iconify icon="solar:star-bold" />}
          onClick={onAddToWatchlist}
        >
          加入自选股
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<Iconify icon="solar:close-circle-bold" />}
          onClick={onClear}
        >
          清空选择
        </Button>
      </Stack>
    </Box>
  );
}
