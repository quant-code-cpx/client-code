import type { Report } from 'src/api/report';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { translateReportError, defaultRetryHintByType } from '../utils/format-error';

type Props = {
  report: Report;
  retrying?: boolean;
  onRetry: () => void;
  onJump?: (path: string) => void;
};

export function ReportErrorCard({ report, retrying = false, onRetry, onJump }: Props) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const tr = translateReportError(report.errorCode, report.errorMessage);
  const fallbackAction = !tr.action ? defaultRetryHintByType(report.type) : undefined;
  const action = tr.action ?? fallbackAction;

  return (
    <Card
      sx={{
        p: 3,
        borderLeft: 3,
        borderColor: 'error.main',
        bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.06),
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Iconify
          icon="solar:danger-triangle-bold"
          width={24}
          sx={{ color: 'error.main', flexShrink: 0, mt: 0.25 }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.dark' }}>
            {tr.title}
          </Typography>
          {tr.description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {tr.description}
            </Typography>
          )}

          <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<Iconify icon="solar:refresh-bold" />}
              onClick={onRetry}
              disabled={retrying}
            >
              {retrying ? '正在重试…' : '重新生成'}
            </Button>
            {action?.href && (
              <Button size="small" variant="outlined" onClick={() => onJump?.(action.href!)}>
                {action.label}
              </Button>
            )}
            {action?.hint && !action.href && (
              <Typography variant="caption" sx={{ color: 'text.secondary', alignSelf: 'center' }}>
                建议：{action.hint}
              </Typography>
            )}
            {(report.errorCode || report.errorMessage) && (
              <Button
                size="small"
                variant="text"
                onClick={() => setExpanded((v) => !v)}
                endIcon={
                  <Iconify
                    icon={expanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                    width={16}
                  />
                }
              >
                {expanded ? '收起原文' : '查看原文'}
              </Button>
            )}
          </Stack>

          <Collapse in={expanded}>
            <Box
              sx={{
                mt: 2,
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'background.paper',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 12,
                color: 'text.secondary',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 220,
                overflow: 'auto',
              }}
            >
              {report.errorCode && (
                <Box sx={{ mb: 1, color: 'text.disabled' }}>code: {report.errorCode}</Box>
              )}
              {report.errorMessage ?? '（后端未返回错误详情）'}
            </Box>
          </Collapse>
        </Box>
      </Stack>
    </Card>
  );
}
