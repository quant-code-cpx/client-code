import type { Report } from 'src/api/report';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fToNow } from 'src/utils/format-time';

import { saveReportNotes } from 'src/api/report';

import { Iconify } from 'src/components/iconify';

type Props = {
  report: Report;
  onSaved?: (notes: string, notesUpdatedAt: string) => void;
  /** When true, panel is read-only with disabled hint (e.g. backend not ready) */
  disabled?: boolean;
};

export function ReportNotesPanel({ report, onSaved, disabled = false }: Props) {
  const [value, setValue] = useState(report.notes ?? '');
  const [savedAt, setSavedAt] = useState<string | null>(report.notesUpdatedAt ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when report changes (e.g. polling refreshes the report object)
  useEffect(() => {
    setValue(report.notes ?? '');
    setSavedAt(report.notesUpdatedAt ?? null);
  }, [report.id, report.notes, report.notesUpdatedAt]);

  const persist = useCallback(
    async (text: string) => {
      if (disabled) return;
      setSaving(true);
      setError(null);
      try {
        const res = await saveReportNotes({ reportId: report.id, notes: text });
        setSavedAt(res.notesUpdatedAt);
        onSaved?.(text, res.notesUpdatedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : '保存失败');
      } finally {
        setSaving(false);
      }
    },
    [disabled, onSaved, report.id]
  );

  // Debounced auto-save (1.5s)
  useEffect(() => {
    if (disabled) return undefined;
    if (value === (report.notes ?? '')) return undefined;
    const timer = setTimeout(() => {
      persist(value);
    }, 1500);
    return () => clearTimeout(timer);
  }, [value, disabled, persist, report.notes]);

  return (
    <Card sx={{ p: 2.5, position: 'sticky', top: 80 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Iconify icon="solar:notebook-bold-duotone" width={18} sx={{ color: 'text.secondary' }} />
          <Typography variant="subtitle2">我的批注</Typography>
        </Stack>
        <Box sx={{ minHeight: 18 }}>
          {disabled ? (
            <Tooltip title="批注功能需要后端 /api/report/notes/save 上线后开启">
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                即将上线
              </Typography>
            </Tooltip>
          ) : saving ? (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <CircularProgress size={12} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                保存中…
              </Typography>
            </Stack>
          ) : savedAt ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              已保存 · {fToNow(savedAt)}
            </Typography>
          ) : null}
        </Box>
      </Stack>

      <TextField
        multiline
        fullWidth
        minRows={8}
        maxRows={20}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          disabled
            ? '批注功能即将上线，敬请期待'
            : '在这里写下你的研究结论，会随报告永久保存（支持 Markdown）'
        }
        disabled={disabled}
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

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </Card>
  );
}
