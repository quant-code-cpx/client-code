import type { TushareSyncPlan, TushareSyncMode, ManualSyncResult } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import TableContainer from '@mui/material/TableContainer';
import TableSortLabel from '@mui/material/TableSortLabel';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { usePermission } from 'src/permission';
import { tushareSyncApi } from 'src/api/tushare-sync';
import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  basic: '基础数据',
  market: '行情数据',
  financial: '财务数据',
  moneyflow: '资金流向',
};

const CATEGORY_ORDER = ['basic', 'market', 'financial', 'moneyflow'] as const;

type CategoryColor = 'primary' | 'info' | 'warning' | 'success';
const CATEGORY_COLORS: Record<string, CategoryColor> = {
  basic: 'primary',
  market: 'info',
  financial: 'warning',
  moneyflow: 'success',
};

const TABLE_HEAD = [
  { id: 'label', label: '任务名称' },
  { id: 'category', label: '分类', width: 110 },
  { id: 'schedule', label: '定时计划' },
  { id: 'supportsFullSync', label: '支持全量', width: 100, align: 'center' as const },
  { id: 'requiresTradeDate', label: '仅交易日', width: 100, align: 'center' as const },
];

// ----------------------------------------------------------------------

export function TushareSyncView() {
  const { hasMinRole } = usePermission();
  const isSuperAdmin = hasMinRole('SUPER_ADMIN');

  const [plans, setPlans] = useState<TushareSyncPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');

  const [mode, setMode] = useState<TushareSyncMode>('incremental');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<ManualSyncResult | null>(null);
  const [syncError, setSyncError] = useState('');

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

  useEffect(() => {
    if (isSuperAdmin) fetchPlans();
  }, [fetchPlans, isSuperAdmin]);

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
  const handleSync = async () => {
    if (selected.size === 0) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncError('');
    try {
      const result = await tushareSyncApi.manualSync(mode, Array.from(selected));
      setSyncResult(result);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : '同步执行失败');
    } finally {
      setSyncing(false);
    }
  };

  // ── derived state ────────────────────────────────────────────────────
  const allSelected = plans.length > 0 && selected.size === plans.length;
  const anySelected = selected.size > 0;
  const indeterminate = anySelected && !allSelected;

  // 全量模式下不支持全量同步的已选任务（将被后端跳过）
  const fullUnsupportedCount =
    mode === 'full'
      ? Array.from(selected).filter((t) => {
          const plan = plans.find((p) => p.task === t);
          return plan && !plan.supportsFullSync;
        }).length
      : 0;

  // ── permission guard ─────────────────────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <DashboardContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 320,
            gap: 2,
          }}
        >
          <Iconify
            icon="solar:shield-keyhole-bold-duotone"
            sx={{ fontSize: 64, color: 'text.disabled' }}
          />
          <Typography variant="h6" color="text.secondary">
            权限不足
          </Typography>
          <Typography variant="body2" color="text.disabled">
            仅超级管理员可访问数据同步功能
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

  // ── render ───────────────────────────────────────────────────────────
  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          数据同步
        </Typography>
      </Box>

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

      {syncError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSyncError('')}>
          {syncError}
        </Alert>
      )}

      {syncResult && (
        <Alert
          severity={syncResult.failedTasks.length > 0 ? 'warning' : 'success'}
          sx={{ mb: 3 }}
          onClose={() => setSyncResult(null)}
        >
          <Typography variant="subtitle2" gutterBottom>
            同步完成，耗时 {syncResult.elapsedSeconds.toFixed(1)} 秒
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <span>✅ 成功：{syncResult.executedTasks.length} 个</span>
            <span>⏭ 跳过：{syncResult.skippedTasks.length} 个</span>
            {syncResult.failedTasks.length > 0 && (
              <span>
                ❌ 失败：{syncResult.failedTasks.length} 个（{syncResult.failedTasks.join('、')}）
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

          <Box sx={{ flex: 1 }} />

          {syncing && (
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

          <Button
            variant="contained"
            disabled={!anySelected || syncing || plansLoading}
            onClick={handleSync}
            startIcon={
              syncing ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Iconify icon="solar:restart-bold" />
              )
            }
          >
            {syncing ? '同步中...' : '开始同步'}
          </Button>
        </Toolbar>

        {/* Table */}
        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 720 }}>
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
    </DashboardContent>
  );
}
