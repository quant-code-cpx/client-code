import type { Report } from 'src/api/report';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

type Props = {
  report: Report;
};

export function ReportNotesPanel({ report }: Props) {
  return (
    <Card sx={{ p: 2.5, position: 'sticky', top: 80 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Iconify icon="solar:notebook-bold-duotone" width={18} sx={{ color: 'text.secondary' }} />
          <Typography variant="subtitle2">我的批注</Typography>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          未开放
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 1.5 }}>
        批注保存能力尚未开放，当前仅展示报告已有批注，不会发送保存请求。
      </Alert>

      <TextField
        multiline
        fullWidth
        minRows={8}
        maxRows={20}
        value={report.notes ?? ''}
        placeholder="暂无批注"
        disabled
        slotProps={{
          input: {
            sx: {
              fontFamily: 'ui-monospace, monospace',
              fontSize: 13,
              lineHeight: 1.6,
            },
          },
        }}
      />

    </Card>
  );
}
