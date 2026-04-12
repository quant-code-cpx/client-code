import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import { useAuth } from 'src/auth';
import {
  triggerHeatmapSnapshot,
  fetchHeatmapSnapshotHistory,
  type HeatmapSnapshotHistoryResult,
} from 'src/api/market';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function HeatmapSnapshotPanel() {
  const { role } = useAuth();

  // Admin-only: ADMIN or SUPER_ADMIN
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return null;

  return <SnapshotPanelInner />;
}

// ── Inner implementation (only rendered for admins) ───────────────────────────

function SnapshotPanelInner() {
  const [snapshotDate, setSnapshotDate] = useState('');
  const [triggerResult, setTriggerResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [snapshotData, setSnapshotData] = useState<HeatmapSnapshotHistoryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [queryError, setQueryError] = useState('');

  const handleTriggerConfirm = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setTriggerResult(null);
    try {
      const res = await triggerHeatmapSnapshot(
        snapshotDate ? { trade_date: snapshotDate } : undefined
      );
      setTriggerResult({ success: res.success, message: res.message });
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
    if (!snapshotDate.trim()) {
      setQueryError('请输入要查询的交易日期');
      return;
    }
    setQueryError('');
    setSnapshotData(null);
    setLoading(true);
    try {
      const res = await fetchHeatmapSnapshotHistory({ trade_date: snapshotDate.trim() });
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
          {/* 标题行 */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Typography variant="h6">快照管理</Typography>
            <Label color="error" variant="soft">
              管理员
            </Label>
          </Stack>

          {/* 操作栏 */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
            <TextField
              size="small"
              label="目标交易日期"
              placeholder="YYYYMMDD（空=最新）"
              value={snapshotDate}
              onChange={(e) => {
                setSnapshotDate(e.target.value);
                setQueryError('');
              }}
              sx={{ width: 200 }}
              error={!!queryError}
              helperText={queryError || ' '}
            />

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

          {/* 触发结果 */}
          {triggerResult && (
            <Alert
              severity={triggerResult.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
              onClose={() => setTriggerResult(null)}
            >
              {triggerResult.message}
            </Alert>
          )}

          {/* 快照查询结果 */}
          {snapshotData && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                快照预览 — {snapshotData.tradeDate}
              </Typography>

              <Stack direction="row" flexWrap="wrap" spacing={2} useFlexGap>
                <InfoItem label="交易日期" value={snapshotData.tradeDate} />
                <InfoItem label="快照生成时间" value={snapshotData.snapshotTime ?? '-'} />
                <InfoItem label="缓存命中" value={snapshotData.fromCache === true ? '是' : '否'} />
                <InfoItem label="股票总数" value={String(snapshotData.stocks?.length ?? 0)} />
                {snapshotData.distribution && (
                  <>
                    <InfoItem label="上涨" value={String(snapshotData.distribution.upCount)} />
                    <InfoItem label="下跌" value={String(snapshotData.distribution.downCount)} />
                    <InfoItem label="涨停" value={String(snapshotData.distribution.limitUp)} />
                    <InfoItem label="跌停" value={String(snapshotData.distribution.limitDown)} />
                  </>
                )}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* 确认对话框 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>确认触发快照聚合</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {snapshotDate
              ? `确定要为 ${snapshotDate} 触发热力图快照聚合吗？`
              : '确定要为最新交易日触发热力图快照聚合吗？'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
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
