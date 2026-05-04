import type { ReactNode } from 'react';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// 空状态引导卡（首次进入面板）
// ----------------------------------------------------------------------

type Props = {
  title: string;
  steps: string[];
  hint?: ReactNode;
};

export function EmptyGuide({ title, steps, hint }: Props) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 3,
        borderRadius: 2,
        border: (t) => `1px dashed ${varAlpha(t.vars.palette.grey['500Channel'], 0.24)}`,
        bgcolor: (t) => varAlpha(t.vars.palette.grey['500Channel'], 0.02),
      }}
    >
      <Iconify icon="solar:test-tube-bold" width={48} sx={{ color: 'primary.main', mb: 2 }} />
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={0.75} sx={{ alignItems: 'center', mb: hint ? 2 : 0 }}>
        {steps.map((s, i) => (
          <Typography key={i} variant="body2" color="text.secondary">
            {i + 1}. {s}
          </Typography>
        ))}
      </Stack>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
