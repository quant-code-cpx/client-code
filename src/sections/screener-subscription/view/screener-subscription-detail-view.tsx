import type {
  SubscriptionHit,
  SubscriptionLog,
  ScreenerSubscription,
  SubscriptionRunStatus,
} from 'src/api/screener-subscription';

import { useParams } from 'react-router-dom';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { useRouter } from 'src/routes/hooks';

import { fDate, fToNow, fDateTime } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  pauseSubscription,
  resumeSubscription,
  getSubscriptionById,
  getSubscriptionHits,
  getSubscriptionLogs,
} from 'src/api/screener-subscription';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { SubscriptionLogTable } from '../subscription-log-table';
import { SubscriptionRunButton } from '../subscription-run-button';
import { SubscriptionStatusLabel } from '../subscription-status-label';
import { SubscriptionMatchPreview } from '../subscription-match-preview';
import { SubscriptionHitEvidenceTable } from '../subscription-hit-evidence';
import { SubscriptionFiltersSummary } from '../subscription-filters-summary';
import { useSubscriptionRunStatus } from '../hooks/use-subscription-run-status';
import { useScreenerSubscriptionRefresh } from '../hooks/use-screener-subscription-refresh';

// ----------------------------------------------------------------------

const FREQUENCY_LABELS = { DAILY: '每日', WEEKLY: '每周', MONTHLY: '每月' } as const;
const RULE_TYPE_LABELS = {
  STOCK_SCREENING: '基础选股',
  FACTOR_SCREENING: '因子选股',
  SIGNAL_EVENT: '技术信号',
  COMPOSITE: '组合规则',
} as const;
const RUN_STATUS_LABELS: Record<SubscriptionRunStatus['status'], string> = {
  QUEUED: '排队中',
  RUNNING: '执行中',
  SUCCESS: '已完成',
  FAILED: '失败',
  SKIPPED_DATA_NOT_READY: '数据暂未就绪，已跳过',
  NOT_FOUND: '任务不存在或已过期',
};

function RuleSnapshotSummary({ subscription }: { subscription: ScreenerSubscription }) {
  const ruleSpec = subscription.ruleSpec;
  if (!ruleSpec) {
    return (
      <SubscriptionFiltersSummary
        filters={subscription.filters}
        sortBy={subscription.sortBy}
        sortOrder={subscription.sortOrder}
      />
    );
  }
  const conditionCount =
    ruleSpec.type === 'STOCK_SCREENING'
      ? Object.keys(ruleSpec.filters).length
      : ruleSpec.conditions.length;
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <Label color="info" variant="soft">
        {RULE_TYPE_LABELS[ruleSpec.type]}
      </Label>
      <Label color="default" variant="soft">
        规则版本 {subscription.ruleVersion ?? ruleSpec.version}
      </Label>
      <Label color="default" variant="soft">
        {conditionCount} 条条件
      </Label>
      {subscription.triggerSpec?.mode ? (
        <Label color="default" variant="soft">
          {subscription.triggerSpec.mode === 'ENTER'
            ? '新进入'
            : subscription.triggerSpec.mode === 'EXIT'
              ? '退出'
              : subscription.triggerSpec.mode === 'BOTH'
                ? '进入和退出'
                : '事件出现'}
        </Label>
      ) : null}
    </Stack>
  );
}

export function ScreenerSubscriptionDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [subscription, setSubscription] = useState<ScreenerSubscription | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  const [logs, setLogs] = useState<SubscriptionLog[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const logsPageSize = 20;

  const [hits, setHits] = useState<SubscriptionHit[]>([]);
  const [hitsLoading, setHitsLoading] = useState(false);
  const [hitsError, setHitsError] = useState('');
  const [hitLogId, setHitLogId] = useState<number | null>(null);
  const detailRequestIdRef = useRef(0);
  const logsRequestIdRef = useRef(0);

  const [actionError, setActionError] = useState('');
  const [actionInfo, setActionInfo] = useState('');

  const numericId = id ? Number(id) : NaN;
  const isValidId = Number.isFinite(numericId) && numericId > 0;

  // ── 拉取详情 ──
  const fetchDetail = useCallback(async (silent = false) => {
    if (!isValidId) {
      setDetailError('订阅 ID 无效');
      return;
    }
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    if (!silent) setLoadingDetail(true);
    setDetailError('');
    try {
      const data = await getSubscriptionById(numericId);
      if (requestId === detailRequestIdRef.current) {
        setSubscription(data);
      }
    } catch (err) {
      if (requestId === detailRequestIdRef.current) {
        setDetailError(err instanceof Error ? err.message : '获取订阅详情失败');
      }
    } finally {
      if (requestId === detailRequestIdRef.current) setLoadingDetail(false);
    }
  }, [isValidId, numericId]);

  const fetchLogs = useCallback(
    async (page: number, silent = false) => {
      if (!isValidId) return;
      const requestId = logsRequestIdRef.current + 1;
      logsRequestIdRef.current = requestId;
      if (!silent) setLogsLoading(true);
      setLogsError('');
      try {
        const res = await getSubscriptionLogs(numericId, page, logsPageSize);
        if (requestId === logsRequestIdRef.current) {
          setLogs(res.logs);
          setLogsTotal(res.total);
        }
      } catch (err) {
        if (requestId === logsRequestIdRef.current) {
          setLogsError(err instanceof Error ? err.message : '加载执行历史失败');
        }
      } finally {
        if (requestId === logsRequestIdRef.current) setLogsLoading(false);
      }
    },
    [isValidId, numericId]
  );

  const handleRunTerminal = useCallback(
    (nextStatus: SubscriptionRunStatus) => {
      if (nextStatus.status === 'NOT_FOUND') return;
      void fetchDetail();
      void fetchLogs(logsPage);
    },
    [fetchDetail, fetchLogs, logsPage]
  );
  const { runStatus, trackRunStatus } = useSubscriptionRunStatus({
    onTerminal: handleRunTerminal,
  });

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    fetchLogs(logsPage);
  }, [fetchLogs, logsPage]);

  // 本订阅命中或连续失败转 ERROR 后，静默刷新详情与当前日志页。
  useScreenerSubscriptionRefresh(
    () => {
      void fetchDetail(true);
      void fetchLogs(logsPage, true);
    },
    isValidId ? numericId : null
  );

  // ── 暂停 / 恢复 ──
  const handlePauseResume = async () => {
    if (!subscription) return;
    setActionError('');
    const next = subscription.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setSubscription({ ...subscription, status: next });
    try {
      if (subscription.status === 'ACTIVE') {
        await pauseSubscription(subscription.id);
      } else {
        await resumeSubscription(subscription.id);
      }
      fetchDetail();
    } catch (err) {
      setSubscription(subscription);
      setActionError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleLoadHits = async (logId: number) => {
    if (!subscription) return;
    setHitsLoading(true);
    setHitsError('');
    setHitLogId(logId);
    try {
      const result = await getSubscriptionHits(subscription.id, logId);
      setHits(result.hits);
    } catch (err) {
      setHits([]);
      setHitsError(err instanceof Error ? err.message : '加载触发证据失败');
    } finally {
      setHitsLoading(false);
    }
  };

  // ── 渲染分支 ──
  if (!isValidId) {
    return (
      <DashboardContent>
        <Alert severity="error">订阅 ID 无效，请通过列表页打开。</Alert>
      </DashboardContent>
    );
  }

  if (loadingDetail && !subscription) {
    return (
      <DashboardContent>
        <Skeleton variant="rounded" height={200} />
      </DashboardContent>
    );
  }

  if (detailError && !subscription) {
    return (
      <DashboardContent>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void fetchDetail()}>
              重试
            </Button>
          }
        >
          {detailError}
        </Alert>
      </DashboardContent>
    );
  }

  if (!subscription) return null;

  return (
    <DashboardContent>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
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
        <SubscriptionRunButton
          subscriptionId={subscription.id}
          lastRunAt={subscription.lastRunAt}
          onSuccess={(msg, jobId) => {
            setActionInfo(msg);
            fetchLogs(logsPage);
            if (jobId) void trackRunStatus(jobId);
          }}
          onError={(msg) => setActionError(msg)}
          label="手动执行"
          size="medium"
        />
        <Button
          variant="contained"
          onClick={() => router.push(`/stock/subscription/${subscription.id}/edit`)}
        >
          编辑
        </Button>
      </Box>

      {runStatus ? (
        <Alert
          severity={
            runStatus.status === 'FAILED' || runStatus.status === 'NOT_FOUND'
              ? 'error'
              : runStatus.status === 'SKIPPED_DATA_NOT_READY'
                ? 'warning'
              : runStatus.status === 'SUCCESS'
                ? 'success'
                : 'info'
          }
          sx={{ mb: 3 }}
        >
          手动执行任务 {runStatus.jobId}：
          {RUN_STATUS_LABELS[runStatus.status]}
          {runStatus.errorMessage || runStatus.message
            ? ` · ${runStatus.errorMessage ?? runStatus.message}`
            : ''}
        </Alert>
      ) : null}

      {/* Info row */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={3}
            alignItems={{ sm: 'center' }}
            sx={{ flexWrap: 'wrap', mb: 2 }}
          >
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
            {subscription.strategyId !== null && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  来源策略
                </Typography>
                <Label color="info" variant="soft">
                  策略 #{subscription.strategyId}（按创建时快照运行）
                </Label>
              </Box>
            )}
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
          </Stack>

          {subscription.status === 'ERROR' && subscription.consecutiveFails > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              连续失败 {subscription.consecutiveFails}{' '}
              次，已自动暂停。点击「恢复」会清零失败计数并重新加入调度。
            </Alert>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            筛选条件快照
          </Typography>
          <RuleSnapshotSummary subscription={subscription} />
        </CardContent>
      </Card>

      {/* Last run match preview */}
      {subscription.lastRunResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              最近一次执行结果（{fDate(subscription.lastRunResult.tradeDate, 'YYYY-MM-DD')}）
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap' }}>
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
            {logsError ? (
              <Alert
                severity="warning"
                action={
                  <Button color="inherit" size="small" onClick={() => fetchLogs(logsPage)}>
                    重试
                  </Button>
                }
              >
                变化明细加载失败：{logsError}
              </Alert>
            ) : (
              <SubscriptionMatchPreview
                newEntryCodes={logs[0]?.newEntryCodes ?? []}
                exitCodes={logs[0]?.exitCodes ?? []}
              />
            )}
            {logs[0] ? (
              <Button
                size="small"
                sx={{ mt: 1.5 }}
                onClick={() => handleLoadHits(logs[0].id)}
                disabled={hitsLoading}
              >
                {hitsLoading && hitLogId === logs[0].id ? '加载证据中…' : '查看触发证据'}
              </Button>
            ) : null}
            {hitsError ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                {hitsError}
              </Alert>
            ) : null}
            {hitLogId && !hitsLoading && !hitsError ? (
              <Box sx={{ mt: 1.5 }}>
                <SubscriptionHitEvidenceTable evidence={hits} />
              </Box>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Log table */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              执行历史
            </Typography>
            {logsError && (
              <Button size="small" onClick={() => fetchLogs(logsPage)}>
                重试
              </Button>
            )}
          </Box>
          {logsError ? (
            <Alert severity="error">{logsError}</Alert>
          ) : (
            <SubscriptionLogTable
              logs={logs}
              total={logsTotal}
              page={logsPage}
              pageSize={logsPageSize}
              loading={logsLoading}
              onPageChange={(p) => setLogsPage(p)}
            />
          )}
        </CardContent>
      </Card>

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
