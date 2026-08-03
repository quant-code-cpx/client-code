import type {
  SubscriptionStatus,
  ScreenerSubscription,
  SubscriptionFrequency,
} from 'src/api/screener-subscription';

import { useSearchParams } from 'react-router-dom';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { getSocket } from 'src/lib/socket';
import { DashboardContent } from 'src/layouts/dashboard';
import {
  listSubscriptions,
  pauseSubscription,
  deleteSubscription,
  resumeSubscription,
} from 'src/api/screener-subscription';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

import { SubscriptionListCard } from '../subscription-list-card';
import { SubscriptionEditDialog } from '../subscription-edit-dialog';
import { SubscriptionSummaryCards } from '../subscription-summary-cards';
import { SubscriptionCreateDialog } from '../subscription-create-dialog';
import { type SortKey, SubscriptionListToolbar } from '../subscription-list-toolbar';

// ----------------------------------------------------------------------

const QUOTA_LIMIT = 10;

type StatusFilter = SubscriptionStatus | 'ALL';
type FrequencyFilter = SubscriptionFrequency | 'ALL';

type ScreenerSubscriptionAlertPayload = {
  subscriptionId: number;
  subscriptionName?: string;
  tradeDate?: string;
  newEntryCodes?: string[];
  exitCodes?: string[];
  totalMatch?: number;
};

export function ScreenerSubscriptionListView() {
  const router = useRouter();
  const [searchParams, setSearchParams] = useSearchParams();

  const [subscriptions, setSubscriptions] = useState<ScreenerSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionInfo, setActionInfo] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScreenerSubscription | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScreenerSubscription | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── URL query 持久化 ──
  const search = searchParams.get('q') ?? '';
  const status = (searchParams.get('status') ?? 'ALL') as StatusFilter;
  const frequency = (searchParams.get('freq') ?? 'ALL') as FrequencyFilter;
  const sort = (searchParams.get('sort') ?? 'lastRunDesc') as SortKey;

  const updateQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === '' || v === 'ALL') next.delete(k);
        else next.set(k, v);
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // ── 拉取列表 ──
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

  // ── WebSocket 推送：新增命中时静默刷新 ──
  const fetchListRef = useRef(fetchList);
  fetchListRef.current = fetchList;
  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    const handler = (_payload: ScreenerSubscriptionAlertPayload) => {
      fetchListRef.current();
    };
    socket.on('screener_subscription_alert', handler);
    return () => {
      socket.off('screener_subscription_alert', handler);
    };
  }, []);

  // ── 操作处理 ──
  const handlePauseResume = async (sub: ScreenerSubscription) => {
    setActionError('');
    const nextStatus: SubscriptionStatus = sub.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setSubscriptions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, status: nextStatus } : s))
    );
    try {
      if (sub.status === 'ACTIVE') {
        await pauseSubscription(sub.id);
      } else {
        await resumeSubscription(sub.id);
      }
      // 重新拉取以同步连续失败次数及可能由服务端更新的运行状态。
      fetchList();
    } catch (err) {
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: sub.status } : s))
      );
      setActionError(err instanceof Error ? err.message : '操作失败');
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

  // ── 过滤 + 排序 ──
  const filtered = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    const list = subscriptions.filter((s) => {
      if (status !== 'ALL' && s.status !== status) return false;
      if (frequency !== 'ALL' && s.frequency !== frequency) return false;
      if (trimmed && !s.name.toLowerCase().includes(trimmed)) return false;
      return true;
    });
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'nameAsc':
          return a.name.localeCompare(b.name);
        case 'createdDesc':
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        case 'lastRunAsc': {
          const ax = a.lastRunAt ?? '';
          const bx = b.lastRunAt ?? '';
          return ax.localeCompare(bx);
        }
        case 'lastRunDesc':
        default: {
          const ax = a.lastRunAt ?? '';
          const bx = b.lastRunAt ?? '';
          return bx.localeCompare(ax);
        }
      }
    });
    return sorted;
  }, [subscriptions, search, status, frequency, sort]);

  const reachedQuota = subscriptions.length >= QUOTA_LIMIT;

  return (
    <DashboardContent>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">条件订阅</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            周期化执行选股条件，追踪命中股票变化与失败原因
          </Typography>
        </Box>
        <Tooltip
          title={reachedQuota ? `已达上限 ${QUOTA_LIMIT} 条，请先删除已有订阅` : ''}
          disableHoverListener={!reachedQuota}
        >
          <span>
            <Button
              variant="contained"
              startIcon={<Iconify icon="solar:add-circle-bold" />}
              onClick={() => setCreateOpen(true)}
              disabled={reachedQuota || loading}
            >
              新建订阅
            </Button>
          </span>
        </Tooltip>
      </Box>

      <SubscriptionSummaryCards
        subscriptions={subscriptions}
        loading={loading}
        statusFilter={status}
        onStatusFilterChange={(val) => updateQuery({ status: val === 'ALL' ? null : val })}
      />

      <SubscriptionListToolbar
        search={search}
        onSearchChange={(val) => updateQuery({ q: val || null })}
        status={status}
        onStatusChange={(val) => updateQuery({ status: val === 'ALL' ? null : val })}
        frequency={frequency}
        onFrequencyChange={(val) => updateQuery({ freq: val === 'ALL' ? null : val })}
        sort={sort}
        onSortChange={(val) => updateQuery({ sort: val === 'lastRunDesc' ? null : val })}
        total={subscriptions.length}
        filteredTotal={filtered.length}
      />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchList}>
              重试
            </Button>
          }
          onClose={() => setError('')}
        >
          {error}
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

      {!loading && subscriptions.length > 0 && filtered.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
            没有匹配的订阅，请调整筛选条件
          </Typography>
        </Box>
      )}

      {!loading && filtered.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((sub) => (
            <SubscriptionListCard
              key={sub.id}
              subscription={sub}
              onView={() => router.push(`/stock/subscription/${sub.id}`)}
              onPauseResume={() => handlePauseResume(sub)}
              onRunSuccess={(msg) => {
                setActionInfo(msg);
                fetchList();
              }}
              onRunError={(msg) => setActionError(msg)}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="确认删除"
        content={`确定要删除订阅「${deleteTarget?.name ?? ''}」吗？此操作不可撤销，历史日志将一并不可见。`}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        submitting={deleteLoading}
        confirmColor="error"
        confirmLabel="删除"
      />

      <Snackbar
        open={Boolean(actionError)}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setActionError('')}
      >
        <Alert severity="error" onClose={() => setActionError('')} sx={{ width: '100%' }}>
          {actionError}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(actionInfo)}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={() => setActionInfo('')}
      >
        <Alert severity="success" onClose={() => setActionInfo('')} sx={{ width: '100%' }}>
          {actionInfo}
        </Alert>
      </Snackbar>
    </DashboardContent>
  );
}
