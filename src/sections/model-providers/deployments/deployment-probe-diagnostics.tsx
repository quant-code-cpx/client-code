import type { IconifyName } from 'src/components/iconify';
import type { ModelProbeStep, ModelProbeResult } from 'src/api/model-provider';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { PROBE_STEP_LABELS } from '../model-provider.constants';

const PROBE_STEP_APPEARANCE = {
  PASSED: { icon: 'solar:check-circle-bold', color: 'success.main', label: '通过' },
  FAILED: { icon: 'solar:danger-triangle-bold', color: 'error.main', label: '失败' },
  SKIPPED: { icon: 'solar:info-circle-bold', color: 'info.main', label: '未执行' },
} satisfies Record<ModelProbeStep['status'], { icon: IconifyName; color: string; label: string }>;

export function DeploymentProbeDiagnostics({ probe }: { probe: ModelProbeResult | null }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ display: 'block', mb: probe ? 1 : 0, color: 'text.secondary' }}
      >
        深度探测会按当前默认推理策略、最大输出上限、结构化输出和工具能力执行一至两次最小调用；视觉输入仅保留声明，不在此伪判定。
      </Typography>
      {probe ? (
        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Alert severity={probe.status === 'PASSED' ? 'success' : 'error'}>
            深度探测 {probe.status === 'PASSED' ? '通过' : '失败'} · {probe.durationMs} ms
          </Alert>
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {probe.steps.map((step, index) => {
              const appearance = PROBE_STEP_APPEARANCE[step.status];
              return (
                <Stack
                  key={`${step.key}-${index}`}
                  direction="row"
                  spacing={1}
                  alignItems="flex-start"
                >
                  <Iconify
                    icon={appearance.icon}
                    width={18}
                    sx={{ mt: 0.25, color: appearance.color }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2">{PROBE_STEP_LABELS[step.key]}</Typography>
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'text.secondary' }}
                    >
                      {step.message}
                    </Typography>
                  </Box>
                  <Chip size="small" variant="outlined" label={appearance.label} />
                </Stack>
              );
            })}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}
