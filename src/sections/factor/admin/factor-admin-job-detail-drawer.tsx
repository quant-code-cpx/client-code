import type { AdminJobItem, AdminJobDetailResponse } from 'src/api/factor';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';

import { fmtTradeDate } from 'src/utils/format-time';

import { adminJobRetry, adminJobDetail, adminJobCancel } from 'src/api/factor';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ADMIN_JOB_STATUS_META, ADMIN_JOB_TYPE_LABELS } from '../constants';

// ─── Types ────────────────────────────────────────────────────

type Props = {
  open: boolean;
  job: AdminJobItem | null;
  onClose: () => void;
  onJobRetried?: (newJobId: string) => void;
  onJobCancelled?: () => void;
};

export function FactorAdminJobDetailDrawer({
  open,
  job,
  onClose,
  onJobRetried,
  onJobCancelled,
}: Props) {
  const [detail, setDetail] = useState<AdminJobDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (!open || !job) return undefined;
    let cancelled = false;
    setDetail(null);
    setDetailLoading(true);
    setDetailError('');
    setActionMsg('');

    adminJobDetail({ jobId: job.jobId })
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch(() => {
        if (!cancelled) setDetailError('加载任务详情失败');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, job]);

  if (!job) return null;

  const statusMeta = ADMIN_JOB_STATUS_META[job.status] ?? {
    label: job.status,
    color: 'default' as const,
  };
  const canCancel = job.status === 'PENDING' || job.status === 'RUNNING';
  const canRetry = job.status === 'FAILED' || job.status === 'PARTIAL';

  const handleCancel = async () => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await adminJobCancel({ jobId: job.jobId });
      setActionMsg(res.message || '任务已取消');
      onJobCancelled?.();
    } catch {
      setActionMsg('取消失败');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await adminJobRetry({ jobId: job.jobId, onlyFailed: true });
      setActionMsg(`重试任务已提交：${res.jobId}`);
      onJobRetried?.(res.jobId);
    } catch {
      setActionMsg('重试失败');
    } finally {
      setActionLoading(false);
    }
  };

  const durationSec = job.durationMs != null ? Math.round(job.durationMs / 1000) : null;
  const progressPct =
    job.progress.total > 0 ? Math.round((job.progress.done / job.progress.total) * 100) : 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 640, md: 720 }, p: 3, overflowY: 'auto' } }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">任务详情</Typography>
        <IconButton onClick={onClose} size="small">
          <Iconify icon="solar:close-circle-bold" />
        </IconButton>
      </Stack>

      {/* Basic info */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Label color={statusMeta.color} variant="soft">
            {statusMeta.label}
          </Label>
          <Label color="default" variant="outlined">
            {ADMIN_JOB_TYPE_LABELS[job.type] ?? job.type}
          </Label>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1.5,
            bgcolor: 'action.hover',
            p: 2,
            borderRadius: 1,
          }}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              任务 ID
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {job.jobId}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              触发人
            </Typography>
            <Typography variant="body2">{job.operator}</Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              创建时间
            </Typography>
            <Typography variant="body2">
              {new Date(job.createdAt).toLocaleString('zh-CN')}
            </Typography>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">
              耗时
            </Typography>
            <Typography variant="body2">{durationSec != null ? `${durationSec}s` : '—'}</Typography>
          </Box>
          {job.tradeDate && (
            <Box>
              <Typography variant="overline" color="text.secondary">
                目标交易日
              </Typography>
              <Typography variant="body2">{fmtTradeDate(job.tradeDate!)}</Typography>
            </Box>
          )}
          {job.startDate && (
            <>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  回补起
                </Typography>
                <Typography variant="body2">{fmtTradeDate(job.startDate!)}</Typography>
              </Box>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  回补止
                </Typography>
                <Typography variant="body2">{fmtTradeDate(job.endDate!)}</Typography>
              </Box>
            </>
          )}
        </Box>

        {/* Progress */}
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 0.5 }}
          >
            <Typography variant="body2" color="text.secondary">
              进度
            </Typography>
            <Typography variant="body2">
              {job.progress.done} / {job.progress.total}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            color={statusMeta.color === 'error' ? 'error' : 'primary'}
          />
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Sub-items */}
      {detailLoading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto' }} />}
      {detailError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {detailError}
        </Alert>
      )}

      {detail && detail.subItems && detail.subItems.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            子因子明细
          </Typography>
          <Stack spacing={0.75}>
            {[...detail.subItems]
              .sort((a, b) => {
                // 失败置顶
                const priority = (s: string) => (s === 'FAILED' ? 0 : s === 'PARTIAL' ? 1 : 2);
                return priority(a.status) - priority(b.status);
              })
              .map((sub) => {
                const sm = ADMIN_JOB_STATUS_META[sub.status] ?? {
                  label: sub.status,
                  color: 'default' as const,
                };
                return (
                  <Box key={sub.factorName}>
                    <Stack direction="row" alignItems="flex-start" spacing={1}>
                      <Label color={sm.color} variant="soft" sx={{ minWidth: 68, mt: 0.25 }}>
                        {sm.label}
                      </Label>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                          {sub.factorName}
                        </Typography>
                        {sub.errorMessage && (
                          <Alert severity="error" sx={{ mt: 0.5, py: 0.25 }}>
                            <Typography
                              variant="caption"
                              component="pre"
                              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                            >
                              {sub.errorMessage}
                            </Typography>
                          </Alert>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
          </Stack>
        </Box>
      )}

      {/* Action messages */}
      {actionMsg && (
        <Alert severity={actionMsg.includes('失败') ? 'error' : 'success'} sx={{ mt: 2 }}>
          {actionMsg}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Footer actions */}
      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        {canCancel && (
          <Tooltip title="中止该任务（仅 PENDING/RUNNING 可取消）">
            <Button
              variant="outlined"
              color="warning"
              disabled={actionLoading}
              onClick={handleCancel}
            >
              取消任务
            </Button>
          </Tooltip>
        )}
        {canRetry && (
          <Tooltip title="仅重试失败的子因子">
            <Button variant="contained" disabled={actionLoading} onClick={handleRetry}>
              重试失败子集
            </Button>
          </Tooltip>
        )}
        <Button variant="outlined" color="inherit" onClick={onClose}>
          关闭
        </Button>
      </Stack>
    </Drawer>
  );
}
