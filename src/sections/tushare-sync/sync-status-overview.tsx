import type { IconifyName } from 'src/components/iconify/register-icons';
import type {
  SyncLogItem,
  DataOperationsOverview,
  OperationsFreshnessItem,
} from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { fDateTime } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  refreshKey?: number;
  onGoLogs?: (filters?: {
    task?: string;
    status?: SyncLogItem['status'];
    startDate?: string;
    endDate?: string;
  }) => void;
  onGoQuality?: () => void;
};

const STATUS_META = {
  READY: { label: '已就绪', color: 'success' as const },
  SYNCING: { label: '同步中', color: 'info' as const },
  WAITING: { label: '待同步', color: 'default' as const },
  LATE: { label: '已延迟', color: 'warning' as const },
  FAILED: { label: '失败', color: 'error' as const },
  BLOCKED: { label: '阻塞', color: 'error' as const },
  EMPTY: { label: '无数据', color: 'warning' as const },
  UNKNOWN: { label: '未知', color: 'default' as const },
};

const RUNTIME_META = {
  IDLE: { label: '当前空闲', color: 'success' as const, icon: 'solar:check-circle-bold' as const },
  QUEUED: { label: '任务排队中', color: 'warning' as const, icon: 'solar:history-bold' as const },
  RUNNING: { label: '正在同步', color: 'info' as const, icon: 'solar:refresh-circle-bold' as const },
  STALE: { label: '运行态失联', color: 'error' as const, icon: 'solar:danger-triangle-bold' as const },
  UNKNOWN: { label: '状态未知', color: 'default' as const, icon: 'solar:question-circle-bold' as const },
};

const DATASET_LABELS: Record<string, string> = {
  STOCK_DAILY: 'A股日线行情',
  STOCK_DAILY_BASIC: '每日行情指标',
  STOCK_ADJ_FACTOR: '复权因子',
  STOCK_TECHNICAL_FACTOR: '技术因子',
  STOCK_MONEYFLOW: '个股资金流向',
  FINANCIAL_INDICATOR: '财务指标',
  INCOME_STATEMENT: '利润表',
  BALANCE_SHEET: '资产负债表',
  CASHFLOW: '现金流量表',
  INDEX_DAILY: '核心指数日线',
  SECTOR_DAILY: '同花顺板块日线',
  MARKET_MONEYFLOW: '市场资金流向',
  HSGT: '沪深港通资金流',
  MARGIN_DETAIL: '融资融券明细',
  CYQ_PERF: '筹码获利比例',
  CYQ_CHIPS: '筹码分布',
};

const SYNC_LOG_STATUS_META: Record<string, { label: string; color: 'success' | 'error' | 'default' }> = {
  SUCCESS: { label: '同步成功', color: 'success' },
  FAILED: { label: '同步失败', color: 'error' },
  SKIPPED: { label: '已跳过', color: 'default' },
};

const EXACT_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export function SyncStatusOverviewPanel({ refreshKey = 0, onGoLogs, onGoQuality }: Props) {
  const [overview, setOverview] = useState<DataOperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    setError('');
    try {
      setOverview(await tushareSyncApi.getOperationsOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据运维概览失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchOverview();
  }, [fetchOverview, refreshKey]);

  useEffect(() => {
    if (overview?.runtime.status !== 'RUNNING' && overview?.runtime.status !== 'QUEUED') return undefined;
    const timer = window.setInterval(fetchOverview, 5000);
    return () => window.clearInterval(timer);
  }, [fetchOverview, overview?.runtime.status]);

  if (loading && !overview) return <OverviewSkeleton />;

  if (!overview) {
    return (
      <Alert
        severity="error"
        sx={{ mt: 3 }}
        action={
          <Button color="inherit" size="small" onClick={fetchOverview}>
            重试
          </Button>
        }
      >
        {error || '暂无数据运维概览'}
      </Alert>
    );
  }

  const runtimeMeta = RUNTIME_META[overview.runtime.status];
  const activeTask = overview.runtime.activeTasks.at(-1);

  return (
    <Box sx={{ mt: 3, pb: 3 }}>
      {loading && <LinearProgress aria-label="运行概览更新中" sx={{ mb: 1.5 }} />}
      {error && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {error}，当前展示上次成功快照。
        </Alert>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
        <Box>
          <Typography component="h2" variant="h6" sx={{ textWrap: 'balance' }}>
            数据运行概览
          </Typography>
          <Typography variant="body2" color="text.secondary">
            优先判断核心日频数据是否可用，再处理正在执行的任务与异常。
          </Typography>
        </Box>
        <Tooltip title={`快照生成于 ${fDateTime(overview.generatedAt, EXACT_DATE_TIME_FORMAT)}`}>
          <Typography variant="caption" color="text.secondary">
            应到交易日 {formatTradeDate(overview.expectedTradeDate)}
          </Typography>
        </Tooltip>
      </Stack>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <DecisionCard
            title="核心日频就绪度"
            icon="solar:chart-2-bold"
            tone={overview.coreReadiness.percentage === 100 ? 'success' : 'warning'}
          >
            <Stack direction="row" alignItems="baseline" spacing={1}>
              <Typography variant="h3" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {overview.coreReadiness.percentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {overview.coreReadiness.ready}/{overview.coreReadiness.total} 已到位
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={overview.coreReadiness.percentage}
              color={overview.coreReadiness.percentage === 100 ? 'success' : 'warning'}
              sx={{ my: 1.25, height: 6, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              以真实表内最大交易日对比最近已完成交易日，不再用同步时间代替新鲜度。
            </Typography>
          </DecisionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7, lg: 4 }}>
          <DecisionCard title="当前同步任务" icon={runtimeMeta.icon} tone={runtimeMeta.color}>
            <Box aria-live="polite">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Label color={runtimeMeta.color} variant="soft">
                  {runtimeMeta.label}
                </Label>
                {overview.runtime.runId && (
                  <Typography variant="caption" color="text.secondary" noWrap translate="no">
                    #{overview.runtime.runId.slice(0, 8)}
                  </Typography>
                )}
              </Stack>
              {overview.runtime.status === 'RUNNING' || overview.runtime.status === 'QUEUED' ? (
                <Box sx={{ mt: 1.25 }}>
                  <Stack direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="body2" noWrap>
                      {activeTask?.label ?? `等待执行 ${overview.runtime.totalTasks} 个任务`}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {overview.runtime.percentage}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={overview.runtime.percentage}
                    sx={{ mt: 0.75, height: 6, borderRadius: 1 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    已完成 {overview.runtime.completedTasks}/{overview.runtime.totalTasks}
                    {overview.runtime.estimatedRemainingMs
                      ? ` · 预计剩余 ${formatDuration(overview.runtime.estimatedRemainingMs)}`
                      : ''}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                  没有同步任务占用执行队列。
                </Typography>
              )}
            </Box>
          </DecisionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 5, lg: 3 }}>
          <DecisionCard
            title="需要关注"
            icon="solar:danger-triangle-bold"
            tone={overview.attention.length > 0 ? 'warning' : 'success'}
          >
            {overview.attention.length === 0 ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Iconify aria-hidden="true" icon="solar:check-circle-bold" sx={{ color: 'success.main' }} />
                <Typography variant="body2">暂无高优先级异常</Typography>
              </Stack>
            ) : (
              <Stack spacing={0.75}>
                {overview.attention.map((item) => {
                  const freshnessItem = overview.freshness.find((entry) => entry.dataset === item.dataset);
                  const displayName = resolveDatasetLabel(item.dataset, item.displayName ?? freshnessItem?.displayName);
                  const statusMeta = STATUS_META[item.type as keyof typeof STATUS_META] ?? STATUS_META.UNKNOWN;
                  const lagTradingDays = item.lagTradingDays ?? freshnessItem?.lagTradingDays ?? null;
                  return (
                    <Button
                      key={item.dataset}
                      color="inherit"
                      size="small"
                      aria-label={`查看${displayName}同步日志`}
                      onClick={() => onGoLogs?.({ task: item.task })}
                      sx={{
                        px: 1.25,
                        py: 1,
                        width: 1,
                        minWidth: 0,
                        textAlign: 'left',
                        borderRadius: 1,
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                        bgcolor: 'background.neutral',
                      }}
                    >
                      <Box
                        sx={{
                          width: 3,
                          mr: 1,
                          flexShrink: 0,
                          borderRadius: 1,
                          bgcolor: item.severity === 'HIGH' ? 'error.main' : 'warning.main',
                        }}
                      />
                      <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="space-between">
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {displayName}
                          </Typography>
                          <Label color={statusMeta.color} variant="soft">
                            {item.statusLabel ?? statusMeta.label}
                          </Label>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                          {formatAttentionDetail(item.detail, lagTradingDays, freshnessItem)}
                        </Typography>
                        <Typography variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                          查看同步日志
                        </Typography>
                      </Stack>
                    </Button>
                  );
                })}
              </Stack>
            )}
          </DecisionCard>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ mt: 1.5, overflow: 'hidden' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
          <Box>
            <Typography variant="subtitle1">日频接口新鲜度</Typography>
            <Typography variant="caption" color="text.secondary">
              核心接口优先；水位、应到日、质量和调度口径来自后端统一目录。
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            共 {overview.freshness.length} 项
          </Typography>
        </Stack>
        <TableContainer>
          <Table size="small" aria-label="日频接口新鲜度">
            <TableHead>
              <TableRow>
                <TableCell>数据接口</TableCell>
                <TableCell>优先级</TableCell>
                <TableCell>当前水位</TableCell>
                <TableCell>应到交易日</TableCell>
                <TableCell>延迟</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>调度 / SLA</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overview.freshness.map((item) => {
                const meta = STATUS_META[item.status];
                return (
                  <TableRow key={item.dataset} hover>
                    <TableCell>
                      <Tooltip title={`同步任务：${item.sourceTask}`}>
                        <Typography variant="body2" sx={{ fontWeight: 600, width: 'fit-content' }}>
                          {resolveDatasetLabel(item.dataset, item.displayName)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Label
                        color={item.criticality === 'CORE' ? 'error' : item.criticality === 'IMPORTANT' ? 'warning' : 'default'}
                        variant="soft"
                      >
                        {item.criticality === 'CORE' ? '核心' : item.criticality === 'IMPORTANT' ? '重要' : '常规'}
                      </Label>
                    </TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatTradeDate(item.dataThrough)}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatTradeDate(item.expectedTradeDate)}</TableCell>
                    <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {item.lagTradingDays === null ? '—' : `${item.lagTradingDays} 个交易日`}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={item.reason}>
                        <span>
                          <Label color={meta.color} variant="soft">
                            {meta.label}
                          </Label>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {item.schedule ?? '未配置'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.slaDueAt ? `SLA ${fDateTime(item.slaDueAt, 'HH:mm')}` : '无 SLA'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => onGoLogs?.({ task: item.sourceTask })}>
                        日志
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2">最近同步链路</Typography>
                <Typography variant="caption" color="text.secondary">
                  从运行态恢复当前轮次，完成后保留最近任务结果。
                </Typography>
              </Box>
              <Button size="small" onClick={() => onGoLogs?.()}>
                查看全部日志
              </Button>
            </Stack>
            <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
              {overview.recentRun ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {resolveRecentTaskLabel(overview.recentRun.task, overview.freshness)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {fDateTime(overview.recentRun.startedAt, EXACT_DATE_TIME_FORMAT)}
                    </Typography>
                  </Box>
                  <Label color={resolveSyncLogStatus(overview.recentRun.status).color} variant="soft">
                    {resolveSyncLogStatus(overview.recentRun.status).label}
                  </Label>
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  暂无同步记录。
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2">质量与重试</Typography>
                <Typography variant="caption" color="text.secondary">
                  质量失败和耗尽重试会抬升关注优先级。
                </Typography>
              </Box>
              <Button size="small" onClick={onGoQuality} disabled={!onGoQuality}>
                数据质量
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
              <Metric label="质量通过" value={overview.quality.pass} tone="success" />
              <Metric label="质量告警" value={overview.quality.warn} tone="warning" />
              <Metric label="质量失败" value={overview.quality.fail} tone="error" />
              <Metric label="待重试" value={overview.retryQueue.pending + overview.retryQueue.retrying} tone="info" />
              <Metric label="重试耗尽" value={overview.retryQueue.exhausted} tone="error" />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function DecisionCard({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: IconifyName;
  tone: 'success' | 'warning' | 'error' | 'info' | 'default';
  children: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        borderTopWidth: 3,
        borderTopColor: tone === 'default' ? 'divider' : `${tone}.main`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
        <Iconify
          aria-hidden="true"
          icon={icon}
          sx={{ color: tone === 'default' ? 'text.secondary' : `${tone}.main` }}
        />
        <Typography component="h3" variant="subtitle2">
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Box sx={{ minWidth: 88, p: 1, borderRadius: 1, bgcolor: 'background.neutral' }}>
      <Typography variant="h6" color={`${tone}.main`} sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function OverviewSkeleton() {
  return (
    <Box sx={{ mt: 3 }}>
      <Grid container spacing={1.5}>
        {[5, 4, 3].map((size) => (
          <Grid key={size} size={{ xs: 12, lg: size }}>
            <Skeleton variant="rounded" height={180} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rounded" height={360} sx={{ mt: 1.5 }} />
    </Box>
  );
}

function formatTradeDate(value: string | null): string {
  if (!value || value.length !== 8) return '—';
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
}

function formatDuration(milliseconds: number): string {
  const minutes = Math.ceil(milliseconds / 60000);
  return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分钟`;
}

function resolveDatasetLabel(dataset: string, fallback?: string): string {
  return DATASET_LABELS[dataset] ?? fallback ?? '未命名数据接口';
}

function formatAttentionDetail(
  fallback: string,
  lagTradingDays: number | null,
  freshnessItem?: OperationsFreshnessItem
): string {
  if (freshnessItem?.status === 'LATE') {
    const lagText = lagTradingDays === null ? '数据未按期更新' : `落后 ${lagTradingDays} 个交易日`;
    return `${lagText} · 当前至 ${formatTradeDate(freshnessItem.dataThrough)}`;
  }
  if (freshnessItem?.status === 'FAILED') return '最近一次同步失败，请查看日志定位原因';
  if (freshnessItem?.status === 'EMPTY') return '尚无可用数据，请检查同步计划';
  if (freshnessItem?.status === 'SYNCING') return '同步任务正在执行，可查看实时进度';
  return fallback.replace(/\b(?:LATE|FAILED|EMPTY|SYNCING|UNKNOWN)\b/g, '').trim() || '需要检查数据状态';
}

function resolveRecentTaskLabel(task: string, freshness: OperationsFreshnessItem[]): string {
  const item = freshness.find((entry) => entry.sourceTask === task);
  return item ? resolveDatasetLabel(item.dataset, item.displayName) : '最近同步任务';
}

function resolveSyncLogStatus(status: string) {
  return SYNC_LOG_STATUS_META[status] ?? { label: '状态未知', color: 'default' as const };
}
