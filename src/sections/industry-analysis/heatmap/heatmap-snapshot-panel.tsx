import type { Dayjs } from 'dayjs';
import type { HeatmapSnapshotHistoryResult } from 'src/api/heatmap';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import { useAuth } from 'src/auth';
import { triggerHeatmapSnapshot, fetchHeatmapSnapshotHistory } from 'src/api/heatmap';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

// ----------------------------------------------------------------------

export function HeatmapSnapshotPanel() {
  const { role } = useAuth();

  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return null;

  return <SnapshotPanelInner canTrigger={role === 'SUPER_ADMIN'} />;
}

// ── Inner implementation (only rendered for admins) ──────────────────────────

function SnapshotPanelInner({ canTrigger }: { canTrigger: boolean }) {
  const [snapshotDate, setSnapshotDate] = useState<Dayjs | null>(null);
  const [triggerResult, setTriggerResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [snapshotData, setSnapshotData] = useState<HeatmapSnapshotHistoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [queryError, setQueryError] = useState('');

  const snapshotDateStr = snapshotDate ? snapshotDate.format('YYYYMMDD') : '';

  const handleTriggerConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setTriggerResult(null);
    try {
      const res = await triggerHeatmapSnapshot(
        snapshotDateStr ? { trade_date: snapshotDateStr } : undefined
      );
      setTriggerResult({
        success: res.totalRecords > 0,
        message: `快照聚合完成，共聚合 ${res.totalRecords} 条记录（交易日：${res.tradeDate}）`,
      });
    } catch (err) {
      setTriggerResult({
        success: false,
        message: err instanceof Error ? err.message : '触发失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!snapshotDateStr) {
      setQueryError('请选择要查询的交易日期');
      return;
    }
    setQueryError('');
    setSnapshotData(null);
    setLoading(true);
    try {
      const res = await fetchHeatmapSnapshotHistory({ trade_date: snapshotDateStr });
      setSnapshotData(res);
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : '查询失败，请检查日期是否有效');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h6">快照管理</Typography>
            <Label color="error" variant="soft">
              管理员
            </Label>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
            <DatePicker
              label="目标交易日期"
              value={snapshotDate}
              onChange={(newVal) => {
                setSnapshotDate(newVal);
                setQueryError('');
              }}
              slotProps={{
                textField: {
                  error: !!queryError,
                  helperText: queryError || ' ',
                },
              }}
            />

            {canTrigger && (
              <Button
                variant="contained"
                color="warning"
                disabled={loading}
                startIcon={<Iconify icon="solar:refresh-bold" />}
                onClick={() => setConfirmOpen(true)}
                sx={{ mt: 0.25 }}
              >
                触发快照聚合
              </Button>
            )}

            <Button
              variant="outlined"
              disabled={loading}
              startIcon={<Iconify icon="solar:magnifier-bold" />}
              onClick={handleQuery}
              sx={{ mt: 0.25 }}
            >
              查询快照
            </Button>
          </Stack>

          {triggerResult && (
            <Alert
              severity={triggerResult.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
              onClose={() => setTriggerResult(null)}
            >
              {triggerResult.message}
            </Alert>
          )}

          {snapshotData && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                快照预览 — {snapshotData.tradeDate}
              </Typography>

              <Stack direction="row" flexWrap="wrap" spacing={2} useFlexGap>
                <InfoItem label="交易日期" value={snapshotData.tradeDate} />
                <InfoItem label="分组维度" value={snapshotData.groupBy} />
                <InfoItem
                  label="数据来源"
                  value={snapshotData.isFromSnapshot ? '快照缓存' : '实时计算'}
                />
                <InfoItem label="股票总数" value={String(snapshotData.stockCount)} />
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={canTrigger && confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>确认触发快照聚合</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {snapshotDateStr
              ? `确定要为 ${snapshotDateStr} 触发热力图快照聚合吗？`
              : '确定要为最新交易日触发热力图快照聚合吗？'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmOpen(false)}>
            取消
          </Button>
          <Button variant="contained" color="warning" onClick={handleTriggerConfirm}>
            确认触发
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 100 }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}
