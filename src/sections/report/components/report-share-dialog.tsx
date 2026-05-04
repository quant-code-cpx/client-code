import type { ReportShareLink } from 'src/api/report';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { listReportShareLinks, createReportShareLink, revokeReportShareLink } from 'src/api/report';

import { Iconify } from 'src/components/iconify';

type Props = {
  open: boolean;
  reportId: string;
  onClose: () => void;
  onMessage?: (message: string, severity: 'success' | 'error' | 'info') => void;
};

const TTL_OPTIONS: { label: string; hours: number | null }[] = [
  { label: '24 小时', hours: 24 },
  { label: '7 天', hours: 24 * 7 },
  { label: '30 天', hours: 24 * 30 },
  { label: '永久', hours: null },
];

export function ReportShareDialog({ open, reportId, onClose, onMessage }: Props) {
  const [ttlHours, setTtlHours] = useState<number | null>(24 * 7);
  const [allowDownload, setAllowDownload] = useState(true);
  const [creating, setCreating] = useState(false);
  const [list, setList] = useState<ReportShareLink[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    setUnsupported(false);
    try {
      const items = await listReportShareLinks({ reportId });
      setList(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '加载失败';
      // Treat 404/501-ish as feature not yet wired
      if (/not found|unsupported|404|501/i.test(msg)) {
        setUnsupported(true);
      } else {
        setLoadError(msg);
      }
    }
  }, [reportId]);

  useEffect(() => {
    if (!open) return;
    setList(null);
    load();
  }, [open, load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const link = await createReportShareLink({ reportId, ttlHours, allowDownload });
      setList((prev) => (prev ? [link, ...prev] : [link]));
      onMessage?.('分享链接已生成，可点击复制', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败';
      if (/not found|unsupported|404|501/i.test(msg)) {
        setUnsupported(true);
      } else {
        onMessage?.(msg, 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (token: string) => {
    try {
      await revokeReportShareLink({ token });
      setList((prev) =>
        prev ? prev.map((it) => (it.token === token ? { ...it, revoked: true } : it)) : prev
      );
      onMessage?.('已吊销该分享链接', 'info');
    } catch (err) {
      onMessage?.(err instanceof Error ? err.message : '吊销失败', 'error');
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      onMessage?.('已复制到剪贴板', 'success');
    } catch {
      onMessage?.('复制失败，请手动复制', 'error');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>分享报告</DialogTitle>
      <DialogContent dividers>
        {unsupported && (
          <Alert severity="info" sx={{ mb: 2 }}>
            分享链接功能需后端 <code>/api/report/share/*</code> 接口上线后启用。
          </Alert>
        )}
        {!unsupported && (
          <>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField
                select
                size="small"
                label="过期时间"
                value={ttlHours === null ? 'NEVER' : String(ttlHours)}
                onChange={(e) =>
                  setTtlHours(e.target.value === 'NEVER' ? null : Number(e.target.value))
                }
                sx={{ minWidth: 140 }}
              >
                {TTL_OPTIONS.map((opt) => (
                  <MenuItem
                    key={opt.label}
                    value={opt.hours === null ? 'NEVER' : String(opt.hours)}
                  >
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={allowDownload}
                    onChange={(e) => setAllowDownload(e.target.checked)}
                  />
                }
                label="允许下载文件"
              />
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                size="small"
                disabled={creating}
                onClick={handleCreate}
                startIcon={<Iconify icon="solar:copy-bold" />}
              >
                {creating ? '生成中…' : '生成链接'}
              </Button>
            </Stack>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              已生成的链接
            </Typography>
            {list === null ? (
              <Stack spacing={1}>
                {[0, 1].map((i) => (
                  <Skeleton key={i} variant="rectangular" height={42} sx={{ borderRadius: 1 }} />
                ))}
              </Stack>
            ) : loadError ? (
              <Alert severity="error">{loadError}</Alert>
            ) : list.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                尚未生成任何分享链接
              </Typography>
            ) : (
              <Stack spacing={1}>
                {list.map((link) => (
                  <Stack
                    key={link.token}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'background.neutral',
                      opacity: link.revoked ? 0.5 : 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'ui-monospace, monospace',
                          display: 'block',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {link.url}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        创建于 {fDateTime(link.createdAt)} ·{' '}
                        {link.expiresAt ? `过期 ${fDateTime(link.expiresAt)}` : '永久有效'}
                        {link.revoked ? ' · 已吊销' : ''}
                      </Typography>
                    </Box>
                    {!link.revoked && (
                      <>
                        <IconButton size="small" onClick={() => handleCopy(link.url)}>
                          <Iconify icon="solar:copy-bold" width={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRevoke(link.token)}
                        >
                          <Iconify icon="solar:close-circle-bold" width={16} />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                ))}
              </Stack>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
