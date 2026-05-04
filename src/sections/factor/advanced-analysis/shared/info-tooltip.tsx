import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import type { MethodologyEntry } from '../methodology';

// ----------------------------------------------------------------------

export function InfoTooltip({ entry }: { entry: MethodologyEntry }) {
  return (
    <Tooltip
      arrow
      placement="bottom-start"
      title={
        <Stack spacing={1} sx={{ p: 0.5, maxWidth: 320 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {entry.title}
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6 }}>
            {entry.oneLiner}
          </Typography>
          <Box>
            <Typography
              variant="overline"
              sx={{ display: 'block', color: 'text.secondary', fontSize: 10 }}
            >
              简化公式
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontFamily: 'monospace',
                lineHeight: 1.6,
              }}
            >
              {entry.formula}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="overline"
              sx={{ display: 'block', color: 'text.secondary', fontSize: 10 }}
            >
              输入 / 输出
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.6 }}>
              {entry.io}
            </Typography>
          </Box>
        </Stack>
      }
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          color: 'text.secondary',
          cursor: 'help',
          ml: 0.5,
        }}
      >
        <Iconify icon="solar:info-circle-bold" width={16} />
      </Box>
    </Tooltip>
  );
}
