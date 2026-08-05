import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Iconify } from 'src/components/iconify';

import type { AgentRunProjection } from '../state/agent-state.types';

type RunStatusBarProps = {
  run: AgentRunProjection | null;
  onContinue: () => void;
};

export function RunStatusBar({ run, onContinue }: RunStatusBarProps) {
  if (!run) return null;
  const progressValue =
    run.progress?.total && run.progress.total > 0
      ? Math.min(100, (run.progress.completed / run.progress.total) * 100)
      : null;

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={(theme) => ({
        px: { xs: 2, md: 3.25 },
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.06),
      })}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minHeight: 28 }}>
        <Iconify
          icon={run.status === 'FAILED' ? 'solar:danger-triangle-bold' : 'solar:pulse-2-bold-duotone'}
          width={18}
          sx={{ flexShrink: 0, color: run.status === 'FAILED' ? 'error.main' : 'info.main' }}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {run.stageLabel}
          </Typography>
          {run.planSummary ? (
            <Typography
              variant="caption"
              noWrap
              sx={{ display: 'block', color: 'text.secondary' }}
            >
              {run.planSummary}
            </Typography>
          ) : null}
        </Box>
        {run.progress ? (
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
          >
            {run.progress.label} · {run.progress.completed}
            {run.progress.total ? ` / ${run.progress.total}` : ''}
          </Typography>
        ) : null}
        {run.connectionState === 'RETRYING' ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            正在恢复连接
          </Typography>
        ) : null}
        {run.connectionState === 'PAUSED' ? (
          <Button size="small" onClick={onContinue}>
            继续接收
          </Button>
        ) : null}
      </Stack>
      {progressValue !== null ? (
        <LinearProgress
          variant="determinate"
          value={progressValue}
          aria-label={run.progress?.label}
          sx={{ mt: 0.5, height: 3, borderRadius: 2 }}
        />
      ) : null}
    </Box>
  );
}
