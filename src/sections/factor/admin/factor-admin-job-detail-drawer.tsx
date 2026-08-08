import type { AdminJobItem, AdminJobDetailItem, AdminJobDetailResponse } from 'src/api/factor';

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
import CircularProgress from '@mui/material/CircularProgress';

import { fmtTradeDate } from 'src/utils/format-time';

import { adminJobDetail } from 'src/api/factor';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

type Props = {
  open: boolean;
  job: AdminJobItem | null;
  onClose: () => void;
};

const DETAIL_STATUS_META: Record<
  AdminJobDetailItem['status'],
  { label: string; color: 'success' | 'warning' | 'error' }
> = {
  OK: { label: '正常', color: 'success' },
  LOW_COVERAGE: { label: '低覆盖', color: 'warning' },
  FAILED: { label: '失败', color: 'error' },
};

export function FactorAdminJobDetailDrawer({ open, job, onClose }: Props) {
  const [detail, setDetail] = useState<AdminJobDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!open || !job) return undefined;
    let cancelled = false;
    setDetail(null);
    setDetailLoading(true);
    setDetailError('');

    adminJobDetail({ tradeDate: job.tradeDate })
      .then((response) => {
        if (!cancelled) setDetail(response);
      })
      .catch(() => {
        if (!cancelled) setDetailError('加载批次详情失败');
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, job]);

  if (!job) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: { sx: { width: { xs: '100%', sm: 640 }, p: 3, overflowY: 'auto' } },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">批次详情</Typography>
        <Tooltip title="关闭">
          <IconButton onClick={onClose} size="small" aria-label="关闭">
            <Iconify icon="solar:close-circle-bold" />
          </IconButton>
        </Tooltip>
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
            批次交易日
          </Typography>
          <Typography variant="body2">{fmtTradeDate(job.tradeDate)}</Typography>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">
            因子数
          </Typography>
          <Typography variant="body2">{job.factorCount.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">
            样本总量
          </Typography>
          <Typography variant="body2">{job.totalStocks.toLocaleString()}</Typography>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">
            缺失样本
          </Typography>
          <Typography variant="body2">{job.missingStocks.toLocaleString()}</Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {detailLoading ? (
        <CircularProgress size={24} sx={{ display: 'block', mx: 'auto' }} />
      ) : null}
      {detailError ? <Alert severity="error">{detailError}</Alert> : null}

      {detail && detail.items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
          当前批次暂无逐因子快照
        </Typography>
      ) : null}

      {detail && detail.items.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
            逐因子快照（{detail.factorCount}）
          </Typography>
          <Stack spacing={1}>
            {detail.items.map((item) => {
              const statusMeta = DETAIL_STATUS_META[item.status];
              return (
                <Box
                  key={item.factorName}
                  sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: 'monospace', flex: 1, minWidth: 0 }}
                      noWrap
                    >
                      {item.factorName}
                    </Typography>
                    <Label color={statusMeta.color} variant="soft">
                      {statusMeta.label}
                    </Label>
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 0.75 }}>
                    <Typography variant="caption" color="text.secondary">
                      样本 {item.totalStocks.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      缺失 {item.missingStocks.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      覆盖 {(item.coverageRate * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.syncedAt ? new Date(item.syncedAt).toLocaleString('zh-CN') : '—'}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      ) : null}

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button variant="text" color="inherit" onClick={onClose}>
          关闭
        </Button>
      </Stack>
    </Drawer>
  );
}
