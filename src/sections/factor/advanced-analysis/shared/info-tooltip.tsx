import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

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
              sx={{ display: 'block', color: 'text.secondary', fontSize: 12 }}
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
              sx={{ display: 'block', color: 'text.secondary', fontSize: 12 }}
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
      <IconButton
        size="small"
        aria-label={`查看${entry.title}说明`}
        sx={{
          color: 'text.secondary',
          ml: 0.5,
        }}
      >
        <Iconify icon="solar:info-circle-bold" width={16} />
      </IconButton>
    </Tooltip>
  );
}
