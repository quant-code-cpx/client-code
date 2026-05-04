import type { ReactNode } from 'react';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { InfoTooltip } from './info-tooltip';

import type { MethodologyEntry } from '../methodology';

// ----------------------------------------------------------------------
// 通用结果卡：标题 + 可选 InfoTooltip + 右上角 Action 槽位 + 内容
// ----------------------------------------------------------------------

type Props = {
  title: string;
  methodology?: MethodologyEntry;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  pendingNotice?: string;
};

export function ResultCard({
  title,
  methodology,
  subtitle,
  actions,
  children,
  pendingNotice,
}: Props) {
  return (
    <Card sx={{ overflow: 'hidden' }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              {methodology && <InfoTooltip entry={methodology} />}
            </Stack>
            {subtitle && (
              <Box sx={{ mt: 0.5 }}>
                {typeof subtitle === 'string' ? (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                ) : (
                  subtitle
                )}
              </Box>
            )}
          </Box>
          {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
        </Stack>

        {pendingNotice && (
          <Box
            sx={{
              mb: 2,
              px: 1.5,
              py: 1,
              borderRadius: 1,
              bgcolor: (t) => varAlpha(t.vars.palette.warning.mainChannel, 0.08),
              color: 'warning.darker',
              fontSize: 12,
            }}
          >
            {pendingNotice}
          </Box>
        )}

        {children}
      </CardContent>
    </Card>
  );
}
