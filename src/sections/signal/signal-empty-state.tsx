import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function SignalEmptyState() {
  return (
    <Box
      sx={{
        py: 10,
        display: 'flex',
        textAlign: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <Iconify
        icon="solar:pulse-2-bold-duotone"
        width={64}
        sx={{ color: 'text.disabled', mb: 2 }}
      />

      <Typography variant="h6" sx={{ mb: 1 }}>
        暂无已激活的策略信号
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        前往策略管理页面，在策略详情中激活信号生成
      </Typography>

      <Button
        component={RouterLink}
        href="/strategy"
        variant="contained"
        startIcon={<Iconify icon="solar:layers-bold" />}
      >
        前往策略管理
      </Button>
    </Box>
  );
}
