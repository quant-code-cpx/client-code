import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

function InfoRow({ label }: { label: string }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" color="text.disabled">
        —
      </Typography>
    </Box>
  );
}

export function FactorAdminSchedulePanel() {
  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        定时调度配置
      </Typography>
      <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />} sx={{ mb: 3 }}>
        调度接口当前为占位能力，暂不提供真实配置数据。
      </Alert>
      <Stack
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2.5,
        }}
      >
        <InfoRow label="Cron 表达式" />
        <InfoRow label="调度启用" />
        <InfoRow label="上次触发时间" />
        <InfoRow label="下次触发时间" />
        <InfoRow label="时区" />
        <InfoRow label="错误信息" />
      </Stack>
    </Box>
  );
}
