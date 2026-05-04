import type { ReportProgress } from 'src/api/report';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

const STAGE_LABELS: Record<string, string> = {
  loading: '正在加载源数据',
  computing: '正在计算指标',
  rendering: '正在渲染图表',
  persisting: '正在保存文件',
};

type Props = {
  progress: ReportProgress | null | undefined;
};

export function ReportProgressBar({ progress }: Props) {
  // No backend progress field: degrade to indeterminate
  if (!progress) {
    return (
      <Box>
        <LinearProgress sx={{ height: 6, borderRadius: 1 }} />
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
          报告正在生成中…
        </Typography>
      </Box>
    );
  }

  const percent = Math.max(0, Math.min(100, progress.percent ?? 0));
  const stageLabel = progress.label ?? STAGE_LABELS[progress.stage] ?? progress.stage;

  return (
    <Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 6,
          borderRadius: 1,
          '& .MuiLinearProgress-bar': {
            transition: 'transform 600ms cubic-bezier(0.4, 0, 0.2, 1)',
          },
        }}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {stageLabel}
          {progress.etaSeconds != null && progress.etaSeconds > 0
            ? ` · 预计 ${Math.ceil(progress.etaSeconds)}s`
            : ''}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
        >
          {percent.toFixed(0)}%
        </Typography>
      </Stack>
    </Box>
  );
}
