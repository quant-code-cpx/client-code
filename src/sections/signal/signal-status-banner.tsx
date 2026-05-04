import type { LatestSignalResponse } from 'src/api/signal';
import type { IconifyName } from 'src/components/iconify/register-icons';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  status: LatestSignalResponse['status'];
  lastRunAt?: string | null;
  lastRunError?: string | null;
  onRetry?: () => void;
};

const STATUS_META: Record<
  NonNullable<Props['status']>,
  { severity: 'info' | 'warning' | 'error'; icon: IconifyName; title: string } | null
> = {
  ok: null,
  pending: {
    severity: 'info',
    icon: 'solar:clock-circle-outline',
    title: '今日跑批进行中',
  },
  failed: {
    severity: 'error',
    icon: 'solar:danger-triangle-bold',
    title: '今日跑批失败',
  },
  stale: {
    severity: 'warning',
    icon: 'solar:clock-circle-outline',
    title: '信号数据陈旧',
  },
};

export function SignalStatusBanner({ status, lastRunAt, lastRunError, onRetry }: Props) {
  if (!status || status === 'ok') return null;
  const meta = STATUS_META[status];
  if (!meta) return null;

  const lastRunLabel = lastRunAt
    ? new Date(lastRunAt).toLocaleString('zh-CN', { hour12: false })
    : '—';

  return (
    <Alert
      severity={meta.severity}
      icon={<Iconify icon={meta.icon} width={20} />}
      sx={{ mb: 2, alignItems: 'center' }}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            重试
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Typography variant="subtitle2">{meta.title}</Typography>
        <Typography variant="caption" color="text.secondary">
          上次跑批：{lastRunLabel}
          {lastRunError ? ` · 错误：${lastRunError}` : ''}
        </Typography>
      </Box>
    </Alert>
  );
}
