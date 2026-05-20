import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  /** 0-1 */
  progress?: number;
  /** 是否显示不确定进度（轮询中但无 progress 字段） */
  indeterminate?: boolean;
};

export function ProgressSnackbar({
  open,
  onClose,
  title,
  message,
  progress,
  indeterminate,
}: Props) {
  const value = Math.max(0, Math.min(100, Math.round((progress ?? 0) * 100)));

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ minWidth: 320 }}
    >
      <Box
        sx={{
          width: 320,
          p: 2,
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          boxShadow: (theme) => theme.shadows[8],
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <Iconify icon="solar:close-circle-bold" width={18} />
          </IconButton>
        </Stack>
        {message ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {message}
          </Typography>
        ) : null}
        <LinearProgress
          variant={indeterminate ? 'indeterminate' : 'determinate'}
          value={value}
          sx={{ mt: 1.5, borderRadius: 1 }}
        />
        {!indeterminate ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}
          >
            {value}%
          </Typography>
        ) : null}
      </Box>
    </Snackbar>
  );
}
