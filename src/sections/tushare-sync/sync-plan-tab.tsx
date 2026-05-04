import type { TushareSyncPlan, TushareSyncMode, SyncLogSummaryItem } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fDateTime } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';
import { useSyncNotification } from 'src/contexts/sync-notification-context';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  basic: '基础数据',
  market: '行情数据',
  financial: '财务数据',
  moneyflow: '资金流向',
  factor: '因子数据',
  alternative: '另类数据',
  fund: '基金数据',
  macro: '宏观数据',
  option: '期权数据',
};

const CATEGORY_ORDER = [
  'basic',
  'market',
  'financial',
  'moneyflow',
  'factor',
  'alternative',
  'fund',
  'macro',
  'option',
] as const;

type CategoryColor = 'primary' | 'info' | 'warning' | 'success' | 'secondary' | 'default';
const CATEGORY_COLORS: Record<string, CategoryColor> = {
  basic: 'primary',
  market: 'info',
  financial: 'warning',
  moneyflow: 'success',
  factor: 'secondary',
  alternative: 'default',
  fund: 'info',
  macro: 'warning',
  option: 'default',
};

const TABLE_HEAD = [
  { id: 'label', label: '任务名称' },
  { id: 'category', label: '分类', width: 110 },
  { id: 'schedule', label: '定时计划' },
  { id: 'supportsFullSync', label: '支持全量', width: 100, align: 'center' as const },
  { id: 'requiresTradeDate', label: '仅交易日', width: 100, align: 'center' as const },
  { id: 'lastStatus', label: '最后状态', width: 112, align: 'center' as const },
  { id: 'lastSyncAt', label: '最后同步', width: 180 },
  { id: 'consecutiveFailures', label: '连失', width: 84, align: 'center' as const },
  { id: 'actions', label: '操作', width: 112, align: 'center' as const },
];

const SYNC_STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  SKIPPED: 'warning',
};

const SYNC_STATUS_LABEL: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
  SKIPPED: '跳过',
};

const READ_ONLY_TOOLTIP = '仅 SUPER_ADMIN 可执行';

type Props = {
  isReadOnly?: boolean;
  refreshKey?: number;
};

// ----------------------------------------------------------------------

export function SyncPlanTab({ isReadOnly = false, refreshKey = 0 }: Props) {
  const [plans, setPlans] = useState<TushareSyncPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');

  const [summary, setSummary] = useState<SyncLogSummaryItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [mode, setMode] = useState<TushareSyncMode>('incremental');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [pendingSync, setPendingSync] = useState<{ mode: TushareSyncMode; tasks: string[] } | null>(
    null
  );
  const [fullConfirmText, setFullConfirmText] = useState('');

  const [submitError, setSubmitError] = useState('');

  const { isSyncing, lastSyncResult, lastSyncError, clearLastResult } = useSyncNotification();

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError('');
    try {
      const data = await tushareSyncApi.getPlans();
      const manualPlans = data.filter((p) => p.supportsManual);
      setPlans(manualPlans);
      setSelected(new Set(manualPlans.map((p) => p.task)));
    } catch (err) {
      setPlansError(err instanceof Error ? err.message : '获取同步任务失败');
    } finally {
      setPlansLoading(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await tushareSyncApi.getSyncLogsSummary();
      setSummary(data);
    } catch {
      setSummary([]);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchSummary();
  }, [fetchPlans, fetchSummary, refreshKey]);

  // ── grouped by category ──────────────────────────────────────────────
  const grouped = CATEGORY_ORDER.reduce<Record<string, TushareSyncPlan[]>>((acc, cat) => {
    acc[cat] = plans.filter((p) => p.category === cat);
    return acc;
  }, {});

  // ── selection helpers ────────────────────────────────────────────────
  const toggleTask = (task: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(task)) next.delete(task);
      else next.add(task);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    const catTasks = (grouped[cat] ?? []).map((t) => t.task);
    const allSelected = catTasks.every((t) => selected.has(t));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) catTasks.forEach((t) => next.delete(t));
      else catTasks.forEach((t) => next.add(t));
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === plans.length) setSelected(new Set());
    else setSelected(new Set(plans.map((p) => p.task)));
  };

  // ── sync action ──────────────────────────────────────────────────────
  const submitSync = async (syncMode: TushareSyncMode, tasks: string[]) => {
    if (tasks.length === 0 || isReadOnly) return;
    setSubmitError('');
    clearLastResult();
    try {
      await tushareSyncApi.manualSync(syncMode, tasks);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '提交同步请求失败');
    }
  };

  const requestSync = (syncMode: TushareSyncMode, tasks: string[]) => {
    if (tasks.length === 0 || isReadOnly) return;
    if (syncMode === 'full') {
      setPendingSync({ mode: syncMode, tasks });
      setFullConfirmText('');
      return;
    }
    submitSync(syncMode, tasks);
  };

  const handleSync = () => {
    requestSync(mode, Array.from(selected));
  };

  const handleConfirmFullSync = async () => {
    if (!pendingSync || fullConfirmText !== 'FULL') return;
    const current = pendingSync;
    setPendingSync(null);
    setFullConfirmText('');
    await submitSync(current.mode, current.tasks);
  };

  // ── derived state ────────────────────────────────────────────────────
  const summaryMap = new Map(summary.map((item) => [item.task, item]));
  const basicTasks = (grouped.basic ?? []).map((plan) => plan.task);
  const failedTasks = summary
    .filter((item) => item.lastStatus === 'FAILED')
    .map((item) => item.task);
  const allSelected = plans.length > 0 && selected.size === plans.length;
  const anySelected = selected.size > 0;
  const indeterminate = anySelected && !allSelected;

  const fullUnsupportedCount =
    mode === 'full'
      ? Array.from(selected).filter((t) => {
          const plan = plans.find((p) => p.task === t);
          return plan && !plan.supportsFullSync;
        }).length
      : 0;

  return (
    <Box sx={{ mt: 3 }}>
      {/* Alerts */}
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
            <span>✅ 成功：{lastSyncResult.executedTasks.length} 个</span>
            <span>⏭ 跳过：{lastSyncResult.skippedTasks.length} 个</span>
            {lastSyncResult.failedTasks.length > 0 && (
              <span>
                ❌ 失败：{lastSyncResult.failedTasks.length} 个（
                {lastSyncResult.failedTasks.join('、')}）
              </span>
            )}
          </Box>
        </Alert>
      )}

      {plansError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {plansError}
        </Alert>
      )}

      {/* Main card */}
      <Card>
        {/* Toolbar */}
        <Toolbar
          sx={{
            height: 96,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: (theme) => theme.spacing(0, 1, 0, 3),
          }}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
            >
              同步模式
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              size="small"
              onChange={(_, v) => {
                if (v) setMode(v as TushareSyncMode);
              }}
            >
              <ToggleButton value="incremental" sx={{ fontSize: 12, px: 2 }}>
                增量同步
              </ToggleButton>
              <ToggleButton value="full" sx={{ fontSize: 12, px: 2, color: 'warning.main' }}>
                全量同步
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : '按 basic 分类触发增量同步'}>
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={isReadOnly || basicTasks.length === 0 || isSyncing || plansLoading}
                  onClick={() => requestSync('incremental', basicTasks)}
                >
                  同步 basic
                </Button>
              </span>
            </Tooltip>
            <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : '按最近失败任务触发增量补跑'}>
              <span>
                <Button
                  size="small"
                  color="warning"
                  variant="outlined"
                  disabled={isReadOnly || failedTasks.length === 0 || isSyncing || summaryLoading}
                  onClick={() => requestSync('incremental', failedTasks)}
                >
                  补最近失败
                </Button>
              </span>
            </Tooltip>
          </Stack>

          <Box sx={{ flex: 1 }} />

          {isSyncing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={14} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                同步中，请勿关闭页面...
              </Typography>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            已选 <strong>{selected.size}</strong> / {plans.length} 个任务
          </Typography>

          <Tooltip title={isReadOnly ? READ_ONLY_TOOLTIP : ''}>
            <span>
              <Button
                variant="contained"
                disabled={!anySelected || isSyncing || plansLoading || isReadOnly}
                onClick={handleSync}
                startIcon={
                  isSyncing ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <Iconify icon="solar:restart-bold" />
                  )
                }
              >
                {isSyncing ? '同步中...' : '开始同步'}
              </Button>
            </span>
          </Tooltip>
        </Toolbar>

        {/* Table */}
        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 1180 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allSelected}
                      indeterminate={indeterminate}
                      onChange={toggleAll}
                      disabled={plansLoading}
                    />
                  </TableCell>
                  {TABLE_HEAD.map((col) => (
                    <TableCell key={col.id} align={col.align ?? 'left'} sx={{ width: col.width }}>
                      <TableSortLabel hideSortIcon>{col.label}</TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {plansLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell padding="checkbox">
                          <Skeleton variant="rectangular" width={18} height={18} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={120} />
                          <Skeleton width={80} height={12} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={70} height={22} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={160} />
                        </TableCell>
                        <TableCell align="center">
                          <Skeleton width={48} height={22} sx={{ mx: 'auto' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Skeleton width={48} height={22} sx={{ mx: 'auto' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Skeleton width={64} height={22} sx={{ mx: 'auto' }} />
                        </TableCell>
                        <TableCell>
                          <Skeleton width={128} />
                        </TableCell>
                        <TableCell align="center">
                          <Skeleton width={32} sx={{ mx: 'auto' }} />
                        </TableCell>
                        <TableCell align="center">
                          <Skeleton width={68} height={28} sx={{ mx: 'auto' }} />
                        </TableCell>
                      </TableRow>
                    ))
                  : CATEGORY_ORDER.filter((cat) => (grouped[cat]?.length ?? 0) > 0).flatMap(
                      (cat) => {
                        const catPlans = grouped[cat] ?? [];
                        const catAll = catPlans.every((p) => selected.has(p.task));
                        const catSome = catPlans.some((p) => selected.has(p.task));
                        const catIndeterminate = catSome && !catAll;

                        return [
                          <TableRow key={`hdr-${cat}`} sx={{ bgcolor: 'background.neutral' }}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={catAll}
                                indeterminate={catIndeterminate}
                                onChange={() => toggleCategory(cat)}
                              />
                            </TableCell>
                            <TableCell colSpan={TABLE_HEAD.length}>
                              <Typography variant="subtitle2">
                                {CATEGORY_LABELS[cat] ?? cat}
                              </Typography>
                            </TableCell>
                          </TableRow>,

                          ...catPlans.map((plan) => {
                            const isSelected = selected.has(plan.task);
                            const dimmed = mode === 'full' && !plan.supportsFullSync && isSelected;
                            const rowSummary = summaryMap.get(plan.task);
                            return (
                              <TableRow
                                key={plan.task}
                                hover
                                selected={isSelected}
                                onClick={() => toggleTask(plan.task)}
                                sx={{ cursor: 'pointer', opacity: dimmed ? 0.45 : 1 }}
                              >
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    size="small"
                                    checked={isSelected}
                                    onChange={() => toggleTask(plan.task)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </TableCell>

                                <TableCell>
                                  <Typography variant="body2">{plan.label}</Typography>
                                  <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                                    {plan.task}
                                  </Typography>
                                </TableCell>

                                <TableCell>
                                  <Label
                                    color={CATEGORY_COLORS[plan.category] ?? 'default'}
                                    variant="soft"
                                  >
                                    {CATEGORY_LABELS[plan.category] ?? plan.category}
                                  </Label>
                                </TableCell>

                                <TableCell>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {plan.schedule?.description ?? '仅手动触发'}
                                  </Typography>
                                </TableCell>

                                <TableCell align="center">
                                  {plan.supportsFullSync ? (
                                    <Label color="success" variant="soft">
                                      支持
                                    </Label>
                                  ) : (
                                    <Tooltip title="该任务不支持全量同步，全量模式下将被跳过">
                                      <Label color="default" variant="soft">
                                        不支持
                                      </Label>
                                    </Tooltip>
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  {plan.requiresTradeDate ? (
                                    <Label color="info" variant="soft">
                                      是
                                    </Label>
                                  ) : (
                                    <Label color="default" variant="soft">
                                      否
                                    </Label>
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  {rowSummary?.lastStatus ? (
                                    <Label
                                      color={SYNC_STATUS_COLOR[rowSummary.lastStatus] ?? 'default'}
                                      variant="soft"
                                    >
                                      {SYNC_STATUS_LABEL[rowSummary.lastStatus] ??
                                        rowSummary.lastStatus}
                                    </Label>
                                  ) : (
                                    <Typography variant="body2" color="text.disabled">
                                      —
                                    </Typography>
                                  )}
                                </TableCell>

                                <TableCell>
                                  <Typography variant="body2" color="text.secondary">
                                    {rowSummary?.lastSyncAt
                                      ? fDateTime(rowSummary.lastSyncAt)
                                      : '—'}
                                  </Typography>
                                </TableCell>

                                <TableCell align="center">
                                  {rowSummary && rowSummary.consecutiveFailures > 0 ? (
                                    <Label
                                      color={
                                        rowSummary.consecutiveFailures >= 3 ? 'error' : 'warning'
                                      }
                                      variant="soft"
                                    >
                                      {rowSummary.consecutiveFailures}
                                    </Label>
                                  ) : (
                                    <Typography variant="body2" color="text.secondary">
                                      0
                                    </Typography>
                                  )}
                                </TableCell>

                                <TableCell align="center">
                                  <Tooltip
                                    title={isReadOnly ? READ_ONLY_TOOLTIP : '立即同步该任务'}
                                  >
                                    <span>
                                      <Button
                                        size="small"
                                        variant="text"
                                        disabled={isReadOnly || isSyncing || plansLoading}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          requestSync(mode, [plan.task]);
                                        }}
                                      >
                                        立即同步
                                      </Button>
                                    </span>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          }),
                        ];
                      }
                    )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>
      </Card>

      <Dialog open={pendingSync !== null} onClose={() => setPendingSync(null)}>
        <DialogTitle>确认全量同步</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            全量同步会拉取历史数据，预计耗时较长。请输入 <strong>FULL</strong> 确认继续。
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            本次将影响 {pendingSync?.tasks.length ?? 0} 个任务。
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="确认文本"
            value={fullConfirmText}
            onChange={(event) => setFullConfirmText(event.target.value)}
            placeholder="FULL"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingSync(null)}>取消</Button>
          <Button
            color="warning"
            variant="contained"
            disabled={fullConfirmText !== 'FULL'}
            onClick={handleConfirmFullSync}
          >
            确认全量同步
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
