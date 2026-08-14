import type { TushareSyncPlan, TushareSyncMode, SyncLogSummaryItem } from 'src/api/tushare-sync';

import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { useSyncNotification } from 'src/contexts/sync-notification-context';

import { SyncPlanTable } from './sync-plan-table';
import { SyncPlanToolbar } from './sync-plan-toolbar';
import { FullSyncConfirmDialog } from './full-sync-confirm-dialog';

// ----------------------------------------------------------------------

type Props = {
  isReadOnly?: boolean;
  refreshKey?: number;
};

export function SyncPlanTab({ isReadOnly = false, refreshKey = 0 }: Props) {
  const [plans, setPlans] = useState<TushareSyncPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');

  const [summary, setSummary] = useState<SyncLogSummaryItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  const [mode, setMode] = useState<TushareSyncMode>('incremental');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectionInitializedRef = useRef(false);

  const [pendingSync, setPendingSync] = useState<{ mode: TushareSyncMode; tasks: string[] } | null>(
    null
  );
  const [fullConfirmText, setFullConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [submitError, setSubmitError] = useState('');
  const [submitAccepted, setSubmitAccepted] = useState('');

  const { isSyncing, lastSyncResult, lastSyncError, clearLastResult } = useSyncNotification();
  const isSyncActionLocked = isSyncing || isSubmitting;

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError('');
    try {
      const data = await tushareSyncApi.getPlans();
      const manualPlans = data.filter((plan) => plan.supportsManual);
      const shouldInitializeSelection = !selectionInitializedRef.current && manualPlans.length > 0;
      if (shouldInitializeSelection) selectionInitializedRef.current = true;
      setPlans(manualPlans);
      setSelected((previous) => {
        if (shouldInitializeSelection) {
          return new Set(manualPlans.map((plan) => plan.task));
        }
        const availableTasks = new Set(manualPlans.map((plan) => plan.task));
        return new Set(Array.from(previous).filter((task) => availableTasks.has(task)));
      });
    } catch (error) {
      setPlansError(error instanceof Error ? error.message : '获取同步任务失败');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await tushareSyncApi.getSyncLogsSummary();
      setSummary(data);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : '获取任务状态摘要失败');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchSummary();
  }, [fetchPlans, fetchSummary, refreshKey]);

  const toggleTask = (task: string) => {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(task)) next.delete(task);
      else next.add(task);
      return next;
    });
  };

  const toggleCategory = (category: string) => {
    const categoryTasks = plans
      .filter((plan) => plan.category === category)
      .map((plan) => plan.task);
    const allSelected = categoryTasks.every((task) => selected.has(task));
    setSelected((previous) => {
      const next = new Set(previous);
      if (allSelected) categoryTasks.forEach((task) => next.delete(task));
      else categoryTasks.forEach((task) => next.add(task));
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === plans.length) setSelected(new Set());
    else setSelected(new Set(plans.map((plan) => plan.task)));
  };

  const submitSync = async (syncMode: TushareSyncMode, tasks: string[]) => {
    if (tasks.length === 0 || isReadOnly || isSyncing || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitAccepted('');
    clearLastResult();
    try {
      const response = await tushareSyncApi.manualSync(syncMode, tasks);
      setSubmitAccepted(response.message || '同步任务已提交，终态以实时通知为准');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '提交同步请求失败');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const requestSync = (syncMode: TushareSyncMode, tasks: string[]) => {
    if (tasks.length === 0 || isReadOnly || isSyncActionLocked || submittingRef.current) return;
    if (syncMode === 'full') {
      setPendingSync({ mode: syncMode, tasks });
      setFullConfirmText('');
      return;
    }
    submitSync(syncMode, tasks);
  };

  const handleConfirmFullSync = async () => {
    if (!pendingSync || fullConfirmText !== '全量' || isSyncActionLocked || submittingRef.current)
      return;
    const current = pendingSync;
    setPendingSync(null);
    setFullConfirmText('');
    await submitSync(current.mode, current.tasks);
  };

  const basicTasks = plans.filter((plan) => plan.category === 'basic').map((plan) => plan.task);
  const failedTasks = summary
    .filter((item) => item.lastStatus === 'FAILED')
    .map((item) => item.task);
  const fullUnsupportedCount =
    mode === 'full'
      ? Array.from(selected).filter((task) => {
          const plan = plans.find((item) => item.task === task);
          return plan && !plan.supportsFullSync;
        }).length
      : 0;

  return (
    <Box sx={{ mt: 2 }}>
      {mode === 'full' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          全量模式将拉取所有历史数据，耗时可能较长（数分钟至数十分钟），请谨慎操作。
          {fullUnsupportedCount > 0 && (
            <>
              {' '}
              已选中 <strong>{fullUnsupportedCount}</strong>{' '}
              个不支持全量同步的任务，执行时将自动跳过。
            </>
          )}
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError('')}>
          {submitError}
        </Alert>
      )}

      {submitAccepted && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setSubmitAccepted('')}>
          {submitAccepted}。任务仅完成提交，最终结果以 WebSocket 通知或同步日志为准。
        </Alert>
      )}

      {lastSyncError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearLastResult}>
          同步任务异常：{lastSyncError.reason}
        </Alert>
      )}

      {lastSyncResult && (
        <Alert
          severity={lastSyncResult.failedTasks.length > 0 ? 'warning' : 'success'}
          sx={{ mb: 3 }}
          onClose={clearLastResult}
        >
          <Typography variant="subtitle2" gutterBottom>
            同步完成，耗时 {lastSyncResult.elapsedSeconds.toFixed(1)} 秒
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <span>成功：{lastSyncResult.executedTasks.length} 个</span>
            <span>跳过：{lastSyncResult.skippedTasks.length} 个</span>
            {lastSyncResult.failedTasks.length > 0 && (
              <span>
                失败：{lastSyncResult.failedTasks.length} 个（
                {lastSyncResult.failedTasks.join('、')}）
              </span>
            )}
          </Box>
        </Alert>
      )}

      {plansError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchPlans}>
              重试
            </Button>
          }
        >
          {plansError}
        </Alert>
      )}

      {summaryError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchSummary}>
              重试
            </Button>
          }
        >
          {summaryError}
        </Alert>
      )}

      <Card>
        <SyncPlanToolbar
          mode={mode}
          selectedCount={selected.size}
          totalCount={plans.length}
          hasBasicTasks={basicTasks.length > 0}
          hasFailedTasks={failedTasks.length > 0}
          isReadOnly={isReadOnly}
          isSyncing={isSyncing}
          isSubmitting={isSubmitting}
          isSyncActionLocked={isSyncActionLocked}
          plansLoading={plansLoading}
          summaryLoading={summaryLoading}
          onModeChange={setMode}
          onSyncBasic={() => requestSync('incremental', basicTasks)}
          onRetryFailed={() => requestSync('incremental', failedTasks)}
          onSyncSelected={() => requestSync(mode, Array.from(selected))}
        />
        <SyncPlanTable
          plans={plans}
          summary={summary}
          selected={selected}
          mode={mode}
          plansLoading={plansLoading}
          isReadOnly={isReadOnly}
          isSyncActionLocked={isSyncActionLocked}
          onToggleTask={toggleTask}
          onToggleCategory={toggleCategory}
          onToggleAll={toggleAll}
          onRequestSync={requestSync}
        />
      </Card>

      <FullSyncConfirmDialog
        open={pendingSync !== null}
        taskCount={pendingSync?.tasks.length ?? 0}
        confirmText={fullConfirmText}
        isSyncActionLocked={isSyncActionLocked}
        isSubmitting={isSubmitting}
        onClose={() => setPendingSync(null)}
        onConfirmTextChange={setFullConfirmText}
        onConfirm={handleConfirmFullSync}
      />
    </Box>
  );
}
