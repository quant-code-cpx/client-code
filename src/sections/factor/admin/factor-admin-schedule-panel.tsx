import type { AdminScheduleResponse } from 'src/api/factor';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { adminScheduleInfo } from 'src/api/factor';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ─── Helper ───────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2">{value ?? '—'}</Typography>
    </Box>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 2.5,
      }}
    >
      {children}
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────

export function FactorAdminSchedulePanel() {
  const [data, setData] = useState<AdminScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    adminScheduleInfo()
      .then(setData)
      .catch(() => setError('加载调度配置失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />;

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button size="small" onClick={fetchData}>
            重试
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const isHealthy = data.healthy;

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <Typography variant="h6">定时调度配置</Typography>
        <Label color={isHealthy ? 'success' : 'error'} variant="soft">
          {isHealthy ? '健康' : '异常'}
        </Label>
        {!data.enabled && (
          <Label color="warning" variant="soft">
            调度已暂停
          </Label>
        )}
      </Stack>

      <Alert severity="info" icon={<Iconify icon="solar:info-circle-bold" />} sx={{ mb: 3 }}>
        本面板为只读视图；如需修改调度规则，请联系后端运维人员。
      </Alert>

      <InfoGrid>
        <InfoRow label="Cron 表达式" value={<code>{data.cron}</code>} />
        <InfoRow label="调度启用" value={data.enabled ? '是' : '否'} />
        <InfoRow
          label="上次触发时间"
          value={
            data.lastTriggeredAt ? new Date(data.lastTriggeredAt).toLocaleString('zh-CN') : null
          }
        />
        <InfoRow
          label="下次触发时间"
          value={data.nextTriggerAt ? new Date(data.nextTriggerAt).toLocaleString('zh-CN') : null}
        />
        {data.timezone && <InfoRow label="时区" value={data.timezone} />}
      </InfoGrid>

      {!isHealthy && data.lastError && (
        <Alert severity="error" sx={{ mt: 2.5 }}>
          <Typography
            variant="caption"
            component="pre"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
          >
            {data.lastError}
          </Typography>
        </Alert>
      )}
    </Box>
  );
}
