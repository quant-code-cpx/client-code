import type { ScreenerSubscription } from 'src/api/screener-subscription';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';

import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  runSubscription,
  listSubscriptions,
  pauseSubscription,
  deleteSubscription,
  resumeSubscription,
} from 'src/api/screener-subscription';

import { Iconify } from 'src/components/iconify';

import { SubscriptionListCard } from '../subscription-list-card';
import { SubscriptionEditDialog } from '../subscription-edit-dialog';
import { SubscriptionCreateDialog } from '../subscription-create-dialog';

// ----------------------------------------------------------------------

export function ScreenerSubscriptionListView() {
  const router = useRouter();

  const [subscriptions, setSubscriptions] = useState<ScreenerSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScreenerSubscription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScreenerSubscription | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listSubscriptions();
      setSubscriptions(res.subscriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handlePauseResume = async (sub: ScreenerSubscription) => {
    setActionError('');
    try {
      const updated =
        sub.status === 'ACTIVE' ? await pauseSubscription(sub.id) : await resumeSubscription(sub.id);
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleRun = async (sub: ScreenerSubscription) => {
    setActionError('');
    try {
      await runSubscription(sub.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '手动执行失败');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteSubscription(deleteTarget.id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          条件订阅
        </Typography>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:add-circle-bold" />}
          onClick={() => setCreateOpen(true)}
        >
          新建订阅
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {actionError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={140} />
          ))}
        </Box>
      )}

      {!loading && subscriptions.length === 0 && !error && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            暂无条件订阅
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', mt: 1 }}>
            点击「新建订阅」创建您的第一个条件订阅
          </Typography>
        </Box>
      )}

      {!loading && subscriptions.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {subscriptions.map((sub) => (
            <SubscriptionListCard
              key={sub.id}
              subscription={sub}
              onView={() => router.push(`/stock/subscription/${sub.id}`)}
              onPauseResume={() => handlePauseResume(sub)}
              onRun={() => handleRun(sub)}
              onEdit={() => setEditTarget(sub)}
              onDelete={() => setDeleteTarget(sub)}
            />
          ))}
        </Box>
      )}

      <SubscriptionCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={(sub) => {
          setSubscriptions((prev) => [sub, ...prev]);
        }}
      />

      <SubscriptionEditDialog
        open={editTarget !== null}
        subscription={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={(updated) => {
          setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
          setEditTarget(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} maxWidth="xs">
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除订阅「{deleteTarget?.name}」吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
            取消
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
          >
            {deleteLoading ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardContent>
  );
}
