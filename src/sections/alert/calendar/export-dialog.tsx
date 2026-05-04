import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';

import { alertApi } from 'src/api/alert';

import { Iconify } from 'src/components/iconify';

import { filtersToQueryParams } from './types';

import type { FilterState } from './types';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  filters: FilterState;
  onClose: () => void;
};

const FORMAT_OPTIONS = [
  {
    value: 'csv' as const,
    label: 'CSV (Excel)',
    description: '逗号分隔表格，可在 Excel/WPS 打开',
  },
  {
    value: 'ics' as const,
    label: 'ICS (日历订阅)',
    description: '可导入 Outlook/Apple Calendar/Google 日历',
  },
];

export function ExportDialog({ open, filters, onClose }: Props) {
  const [format, setFormat] = useState<'csv' | 'ics'>('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await alertApi.exportCalendar({
        ...filtersToQueryParams(filters),
        format,
      });
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename || `calendar.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>导出事件日历</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            将按当前筛选条件导出 {filters.startDate.slice(0, 4)}-{filters.startDate.slice(4, 6)}-
            {filters.startDate.slice(6)} 至 {filters.endDate.slice(0, 4)}-
            {filters.endDate.slice(4, 6)}-{filters.endDate.slice(6)} 的事件。
          </Typography>

          <RadioGroup value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'ics')}>
            {FORMAT_OPTIONS.map((opt) => (
              <Box
                key={opt.value}
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: format === opt.value ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                }}
                onClick={() => setFormat(opt.value)}
              >
                <FormControlLabel
                  value={opt.value}
                  control={<Radio size="small" />}
                  sx={{ m: 0 }}
                  label={
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle2">{opt.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opt.description}
                      </Typography>
                    </Stack>
                  }
                />
              </Box>
            ))}
          </RadioGroup>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={16} />
            ) : (
              <Iconify icon="solar:download-bold" width={18} />
            )
          }
        >
          {loading ? '导出中…' : '开始导出'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
