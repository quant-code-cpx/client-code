import type { SubscriptionLog, ScreenerSubscription } from 'src/api/screener-subscription';

import { useParams } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useRouter } from 'src/routes/hooks';

import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  runSubscription,
  pauseSubscription,
  resumeSubscription,
  getSubscriptionById,
  getSubscriptionLogs,
} from 'src/api/screener-subscription';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { SubscriptionLogTable } from '../subscription-log-table';
import { SubscriptionEditDialog } from '../subscription-edit-dialog';
import { SubscriptionStatusLabel } from '../subscription-status-label';
import { SubscriptionMatchPreview } from '../subscription-match-preview';
import { SubscriptionFiltersSummary } from '../subscription-filters-summary';

// ----------------------------------------------------------------------

const FREQUENCY_LABELS = { DAILY: '每日', WEEKLY: '每周', MONTHLY: '每月' } as const;

export function ScreenerSubscriptionDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [subscription, setSubscription] = useState<ScreenerSubscription | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [logs, setLogs] = useState<SubscriptionLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const logsPageSize = 20;
  const [logsLoading, setLogsLoading] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoadingDetail(true);
    setDetailError('');
    try {
      const data = await getSubscriptionById(Number(id));
      setSubscription(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : '获取订阅详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }, [id]);

  const fetchLogs = useCallback(
    async (page: number) => {
      if (!id) return;
      setLogsLoading(true);
      try {
        const res = await getSubscriptionLogs(Number(id), page, logsPageSize);
        setLogs(res.logs);
        setLogsTotal(res.total);
      } catch {
        // silently fail logs
      } finally {
        setLogsLoading(false);
      }
    },
    [id, logsPageSize]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    fetchLogs(logsPage);
  }, [fetchLogs, logsPage]);

  const handlePauseResume = async () => {
    if (!subscription) return;
    setActionError('');
    try {
      const updated =
        subscription.status === 'ACTIVE'
          ? await pauseSubscription(subscription.id)
          : await resumeSubscription(subscription.id);
      setSubscription(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleRun = async () => {
    if (!subscription) return;
    setActionError('');
    try {
      await runSubscription(subscription.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '手动执行失败');
    }
  };

  if (loadingDetail) {
    return (
      <DashboardContent>
        <Skeleton variant="rounded" height={200} />
      </DashboardContent>
    );
  }

  if (detailError) {
    return (
      <DashboardContent>
        <Alert severity="error">{detailError}</Alert>
      </DashboardContent>
    );
  }

  if (!subscription) return null;

  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          startIcon={<Iconify icon="solar:arrow-left-bold" />}
          onClick={() => router.push('/stock/subscription')}
        >
          返回
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {subscription.name}
        </Typography>
        <Button variant="outlined" onClick={handlePauseResume}>
          {subscription.status === 'ACTIVE' ? '暂停' : '恢复'}
        </Button>
        <Button variant="outlined" onClick={handleRun}>
          手动执行
        </Button>
        <Button variant="contained" onClick={() => setEditOpen(true)}>
          编辑
        </Button>
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}

      {/* Info row */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                状态
              </Typography>
              <SubscriptionStatusLabel status={subscription.status} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                频率
              </Typography>
              <Label color="default" variant="soft">
                {FREQUENCY_LABELS[subscription.frequency]}
              </Label>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                创建时间：{fDate(subscription.createdAt, 'YYYY-MM-DD')}
              </Typography>
            </Box>
            {subscription.lastRunAt && (
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  上次执行：{fDateTime(subscription.lastRunAt)} （{fToNow(subscription.lastRunAt)}）
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            筛选条件
          </Typography>
          <SubscriptionFiltersSummary
            filters={subscription.filters}
            sortBy={subscription.sortBy}
            sortOrder={subscription.sortOrder}
          />
        </CardContent>
      </Card>

      {/* Last run match preview */}
      {subscription.lastRunResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              最近一次执行结果（{fDate(subscription.lastRunResult.tradeDate, 'YYYY-MM-DD')}）
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
              <Typography variant="body2">
                匹配 <strong>{subscription.lastRunResult.matchCount}</strong> 只
              </Typography>
              <Typography variant="body2" sx={{ color: 'success.main' }}>
                新增 <strong>{subscription.lastRunResult.newEntryCount}</strong> 只
              </Typography>
              <Typography variant="body2" sx={{ color: 'error.main' }}>
                退出 <strong>{subscription.lastRunResult.exitCount}</strong> 只
              </Typography>
            </Box>
            <SubscriptionMatchPreview
              newEntryCodes={logs[0]?.newEntryCodes ?? []}
              exitCodes={logs[0]?.exitCodes ?? []}
            />
          </CardContent>
        </Card>
      )}

      {/* Log table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            执行历史
          </Typography>
          <SubscriptionLogTable
            logs={logs}
            total={logsTotal}
            page={logsPage}
            pageSize={logsPageSize}
            loading={logsLoading}
            onPageChange={(p) => setLogsPage(p)}
          />
        </CardContent>
      </Card>

      <SubscriptionEditDialog
        open={editOpen}
        subscription={subscription}
        onClose={() => setEditOpen(false)}
        onSuccess={(updated) => {
          setSubscription(updated);
          setEditOpen(false);
        }}
      />
    </DashboardContent>
  );
}
