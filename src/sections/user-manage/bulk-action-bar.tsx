import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type BulkActionBarProps = {
  selectedCount: number;
  submitting: boolean;
  onClear: () => void;
  onEnable: () => void;
  onDisable: () => void;
};

export function BulkActionBar({
  onClear,
  onEnable,
  onDisable,
  submitting,
  selectedCount,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Box
      role="region"
      aria-live="polite"
      sx={(theme) => ({
        mx: 2,
        mb: 2,
        px: 2,
        py: 1.5,
        borderRadius: 1.5,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
      })}
    >
      {submitting && <LinearProgress sx={{ inset: 0, position: 'absolute' }} />}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
          已选中 {selectedCount} 个用户
        </Typography>

        <Button
          size="small"
          color="success"
          variant="outlined"
          disabled={submitting}
          onClick={onEnable}
          startIcon={<Iconify icon="solar:check-circle-bold" />}
        >
          批量启用
        </Button>
        <Button
          size="small"
          color="warning"
          variant="outlined"
          disabled={submitting}
          onClick={onDisable}
          startIcon={<Iconify icon="solar:shield-warning-bold" />}
        >
          批量禁用
        </Button>
        <IconButton size="small" disabled={submitting} onClick={onClear} aria-label="清空选择">
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>
      </Stack>
    </Box>
  );
}
