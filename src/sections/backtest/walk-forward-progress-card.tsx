import type { WalkForwardRunDetail } from 'src/api/backtest';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from 'src/components/label';

import type { BacktestProgressEvent } from './hooks/use-backtest-job';

// ----------------------------------------------------------------------

type Props = {
  detail: WalkForwardRunDetail;
  progressEvent?: BacktestProgressEvent | null;
};

const STAGE_LABEL: Record<string, string> = {
  PARAM_SEARCH: '参数搜索',
  IS_FIT: '样本内拟合',
  OOS_EVAL: '样本外评估',
  AGGREGATE: '结果聚合',
};

function formatEta(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export function WalkForwardProgressCard({ detail, progressEvent }: Props) {
  const progress = progressEvent?.progress ?? detail.progress ?? 0;
  const stage = progressEvent?.stage
    ? (STAGE_LABEL[progressEvent.stage] ?? progressEvent.stage)
    : '等待后端阶段事件';
  const completedWindows = progressEvent?.completedWindows ?? detail.completedWindows ?? 0;
  const windowCount = progressEvent?.windowCount ?? detail.windowCount ?? 0;

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="subtitle2">运行进度</Typography>
            <Typography variant="body2" color="text.secondary">
              {progressEvent?.step ?? 'Socket 分阶段进度未返回时使用任务进度兜底'}
            </Typography>
          </Stack>
          <Label color={detail.status === 'RUNNING' ? 'info' : 'default'}>{stage}</Label>
        </Stack>

        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, progress))}
          sx={{ my: 2 }}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Typography variant="caption" color="text.secondary">
            进度：{progress.toFixed(0)}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            窗口：{completedWindows}/{windowCount || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ETA：{formatEta(progressEvent?.etaSeconds)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
