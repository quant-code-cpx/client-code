import type { AlertColor } from '@mui/material/Alert';
import type { QualityHealthStatus } from 'src/api/tushare-sync';

import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import AlertTitle from '@mui/material/AlertTitle';

import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

const SEVERITY_MAP: Record<QualityHealthStatus['status'], AlertColor> = {
  healthy: 'success',
  degraded: 'warning',
  unhealthy: 'error',
};

const STATUS_LABEL: Record<QualityHealthStatus['status'], string> = {
  healthy: '健康',
  degraded: '降级',
  unhealthy: '异常',
};

type Props = {
  health: QualityHealthStatus | null;
  loading: boolean;
};

export function QualityHealthBanner({ health, loading }: Props) {
  if (loading) {
    return <Skeleton variant="rounded" height={72} sx={{ mb: 2 }} />;
  }

  if (!health) return null;

  return (
    <Alert severity={SEVERITY_MAP[health.status]} sx={{ mb: 2 }}>
      <AlertTitle>数据质量：{STATUS_LABEL[health.status]}</AlertTitle>
      最后检查：{health.lastCheckAt ? fDateTime(health.lastCheckAt) : '暂无'}
      &nbsp;·&nbsp; 失败数据集：{health.failCount}
      &nbsp;·&nbsp; 耗尽补数任务：{health.exhaustedRepairs}
    </Alert>
  );
}
