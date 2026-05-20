import type { ReactNode } from 'react';
import type { Report } from 'src/api/report';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fDateTime } from 'src/utils/format-time';

import { ReportTypeChip, ReportStatusChip } from './report-chips';

type Props = {
  report: Report;
  /** Toolbar buttons rendered on the right of the meta row */
  actions?: ReactNode;
};

const TYPE_BAR_COLOR: Record<string, string> = {
  BACKTEST: 'primary',
  STOCK: 'info',
  PORTFOLIO: 'warning',
  STRATEGY_RESEARCH: 'secondary',
};

export function ReportDetailHeader({ report, actions }: Props) {
  const theme = useTheme();
  const barColor = TYPE_BAR_COLOR[report.type] ?? 'primary';
  const generationMs =
    report.completedAt && report.createdAt
      ? new Date(report.completedAt).getTime() - new Date(report.createdAt).getTime()
      : null;

  return (
    <Card
      sx={{
        p: 3,
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,

          bgcolor: `${barColor}.main` as any,
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
      >
        <Box sx={{ pl: 1.5, flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {report.title}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
            <ReportTypeChip type={report.type} />
            <Box
              component="span"
              sx={{
                px: 1,
                py: 0.25,
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 0.75,
                bgcolor: varAlpha(theme.vars.palette.text.primaryChannel, 0.08),
                color: 'text.secondary',
                alignSelf: 'center',
              }}
            >
              {report.format}
            </Box>
            <ReportStatusChip status={report.status} />
            {report.version != null && (
              <Box
                component="span"
                sx={{
                  px: 1,
                  py: 0.25,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 0.75,
                  bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.12),
                  color: 'info.dark',
                  alignSelf: 'center',
                }}
              >
                v{report.version}
              </Box>
            )}
          </Stack>
          <Stack
            direction="row"
            spacing={2}
            divider={<Divider orientation="vertical" flexItem />}
            sx={{ mt: 1.5 }}
            flexWrap="wrap"
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              创建：{fDateTime(report.createdAt)}
            </Typography>
            {report.completedAt && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                完成：{fDateTime(report.completedAt)}
              </Typography>
            )}
            {generationMs != null && generationMs > 0 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                耗时：{(generationMs / 1000).toFixed(1)}s
              </Typography>
            )}
          </Stack>
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1 }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
