import type { NewsCoverageWarning } from 'src/api/news';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatNewsDataThrough } from '../news-time';

export type NewsCoverageAlertProps = {
  partial: boolean;
  warnings: NewsCoverageWarning[];
  dataThrough: string | null;
};

export function NewsCoverageAlert({ partial, warnings, dataThrough }: NewsCoverageAlertProps) {
  if (!partial) return null;
  const completenessWarnings = warnings.filter((warning) => warning.affectsCompleteness);
  const watermark = formatNewsDataThrough(dataThrough);

  return (
    <Alert severity="warning" role="status" variant="outlined">
      <Stack spacing={0.5}>
        <Typography variant="subtitle2">当前新闻覆盖不完整</Typography>
        {completenessWarnings.map((warning) => (
          <Typography key={warning.warningId} variant="body2">
            {warning.publicMessage}
          </Typography>
        ))}
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {watermark.text}
        </Typography>
      </Stack>
    </Alert>
  );
}
