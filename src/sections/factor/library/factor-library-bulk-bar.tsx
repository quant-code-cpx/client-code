import type { FactorDef } from 'src/api/factor';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  selected: FactorDef[];
  onClear: () => void;
  onAddToScreening: () => void;
  onBatchPrecompute: () => void;
  onCopyNames: () => void;
  batchPrecomputing?: boolean;
};

export function FactorLibraryBulkBar({
  selected,
  onClear,
  onAddToScreening,
  onBatchPrecompute,
  onCopyNames,
  batchPrecomputing,
}: Props) {
  const theme = useTheme();
  const customCount = selected.filter((f) => !f.isBuiltin).length;

  if (selected.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 64,
        zIndex: 3,
        mb: 2,
        py: 1,
        px: 2,
        borderRadius: 1,
        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
        border: '1px solid',
        borderColor: 'primary.main',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
        <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
          已选 {selected.length} 个
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Button
          size="small"
          variant="contained"
          startIcon={<Iconify icon="solar:filter-bold" width={16} />}
          onClick={onAddToScreening}
        >
          加入选股篮
        </Button>

        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="solar:refresh-bold" width={16} />}
          onClick={onBatchPrecompute}
          disabled={customCount === 0 || batchPrecomputing === true}
        >
          {batchPrecomputing ? '预计算中…' : `批量预计算 (${customCount})`}
        </Button>

        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="solar:copy-bold" width={16} />}
          onClick={onCopyNames}
        >
          复制名称
        </Button>

        <Button
          size="small"
          variant="text"
          color="inherit"
          onClick={onClear}
          startIcon={<Iconify icon="solar:close-circle-bold" width={16} />}
        >
          清空
        </Button>
      </Stack>
    </Box>
  );
}
