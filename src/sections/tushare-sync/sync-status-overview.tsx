import type { IconifyName } from 'src/components/iconify/register-icons';
import type { SyncLogItem, SyncStatusOverview } from 'src/api/tushare-sync';

import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { tushareSyncApi, TUSHARE_SYNC_LOG_MAX_PAGE_SIZE } from 'src/api/tushare-sync';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const HEALTH_MAP: Record<
  string,
  { color: 'success' | 'warning' | 'error'; icon: IconifyName; text: string }
> = {
  healthy: { color: 'success', icon: 'solar:check-circle-bold', text: '正常' },
  degraded: { color: 'warning', icon: 'solar:danger-triangle-bold', text: '降级' },
  unhealthy: { color: 'error', icon: 'solar:close-circle-bold', text: '异常' },
  unknown: { color: 'warning', icon: 'solar:danger-triangle-bold', text: '未知' },
};
const HEALTH_DEFAULT = HEALTH_MAP.unknown;

const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  SKIPPED: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
  SUCCESS: '成功',
  FAILED: '失败',
  SKIPPED: '跳过',
};

const EXACT_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const NORMAL_CATEGORY_PREVIEW_COUNT = 4;

type CategoryOverviewRow = {
  category: SyncStatusOverview['categories'][number];
  freshness: ReturnType<typeof freshnessMeta>;
  lagDays: number | null;
  lastSyncAt: string | null;
  failedCount: number;
  consecutiveFailures: number;
  priorityGroup: number;
  priority: number;
};

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

function freshnessMeta(lagDays: number | null): {
  label: string;
  color: 'success' | 'info' | 'warning' | 'error' | 'default';
} {
  if (lagDays === null) return { label: '未知', color: 'default' };
  if (lagDays <= 0) return { label: '当日', color: 'success' };
  if (lagDays <= 1) return { label: 'T-1', color: 'info' };
  if (lagDays <= 7) return { label: '落后 ' + lagDays + ' 天', color: 'warning' };
  return { label: '落后 ' + lagDays + ' 天', color: 'error' };
}

function categoryPriority(
  failedCount: number,
  consecutiveFailures: number,
  lagDays: number | null
): number {
  if (failedCount > 0 || consecutiveFailures > 0) return 0;
  if (lagDays === null || lagDays > 1) return 1;
  if (lagDays === 1) return 2;
  return 3;
}

function getCategoryOverviewRows(
  categories: SyncStatusOverview['categories']
): CategoryOverviewRow[] {
  return categories
    .map((category, index) => {
      const lastSyncAt = category.items.reduce<string | null>((max, item) => {
        if (!item.lastSyncAt) return max;
        return !max || item.lastSyncAt > max ? item.lastSyncAt : max;
      }, null);
      const lagDays = lastSyncAt
        ? dayjs().startOf('day').diff(dayjs(lastSyncAt).startOf('day'), 'day')
        : null;
      const failedCount = category.items.filter((item) => item.lastStatus === 'FAILED').length;
      const consecutiveFailures = category.items.reduce(
        (sum, item) => sum + (item.consecutiveFailures || 0),
        0
      );

      const priorityGroup = categoryPriority(failedCount, consecutiveFailures, lagDays);

      return {
        category,
        lagDays,
        lastSyncAt,
        failedCount,
        consecutiveFailures,
        freshness: freshnessMeta(lagDays),
        priorityGroup,
        priority: priorityGroup * 100 + index,
      };
    })
    .sort((a, b) => a.priority - b.priority);
}

function categoryAttentionMeta(row: CategoryOverviewRow): {
  color: 'success' | 'warning' | 'error' | 'default';
  label: string;
} {
  if (row.failedCount > 0) return { label: '失败 ' + row.failedCount, color: 'error' };
  if (row.consecutiveFailures > 0)
    return { label: '连续失败 ' + row.consecutiveFailures, color: 'warning' };
  if (row.lagDays === null) return { label: '暂无同步记录', color: 'default' };
  if (row.lagDays > 1) return { label: '落后 ' + row.lagDays + ' 天', color: 'warning' };
  return { label: '状态正常', color: 'success' };
}

// ----------------------------------------------------------------------

export function SyncStatusOverviewPanel({ refreshKey = 0, onGoLogs, onGoQuality }: Props) {
  const [overview, setOverview] = useState<SyncStatusOverview | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<SyncLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelineError, setTimelineError] = useState('');
  const [freshnessExpanded, setFreshnessExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const previousRefreshKey = useRef(refreshKey);

  const fetchOverview = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError('');
    try {
      const data = await tushareSyncApi.getSyncStatusOverview(forceRefresh);
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取同步状态总览失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    setTimelineError('');
    try {
      const result = await tushareSyncApi.getSyncLogs({
        startDate: dayjs().format('YYYY-MM-DD'),
        page: 1,
        pageSize: TUSHARE_SYNC_LOG_MAX_PAGE_SIZE,
      });
      setTimelineLogs(result.items ?? []);
    } catch (err) {
      setTimelineError(err instanceof Error ? err.message : '获取今日同步动态失败');
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    const forceRefresh = refreshKey !== previousRefreshKey.current;
    previousRefreshKey.current = refreshKey;
    fetchOverview(forceRefresh);
    fetchTimeline();
  }, [fetchOverview, fetchTimeline, refreshKey]);

  const allItems = overview?.categories?.flatMap((category) => category.items) ?? [];
  const totalSuccess = allItems.filter((item) => item.lastStatus === 'SUCCESS').length;
  const totalFailed = allItems.filter((item) => item.lastStatus === 'FAILED').length;
  const totalSkipped = allItems.filter((item) => item.lastStatus === 'SKIPPED').length;
  const anyConsecutiveFailures = allItems.some((item) => item.consecutiveFailures >= 3);
  const anyFailures = allItems.some(
    (item) => item.lastStatus === 'FAILED' || item.consecutiveFailures > 0
  );
  const derivedHealth = anyConsecutiveFailures
    ? 'unhealthy'
    : anyFailures
      ? 'degraded'
      : 'healthy';
  const lastSyncOverall = allItems.reduce<string | null>((max, item) => {
    if (!item.lastSyncAt) return max;
    return !max || item.lastSyncAt > max ? item.lastSyncAt : max;
  }, null);
  const failedTableNames = allItems
    .filter((item) => item.lastStatus === 'FAILED')
    .map((item) => item.displayName || item.tableName);
  const categoryRows = getCategoryOverviewRows(overview?.categories ?? []);
  const attentionCategoryRows = categoryRows.filter((row) => row.priorityGroup < 2);
  const standardCategoryRows = categoryRows.filter((row) => row.priorityGroup >= 2);
  const collapsedFreshnessRows = [
    ...attentionCategoryRows,
    ...standardCategoryRows.slice(0, NORMAL_CATEGORY_PREVIEW_COUNT),
  ];
  const visibleFreshnessRows = freshnessExpanded ? categoryRows : collapsedFreshnessRows;
  const remainingCategoryCount = categoryRows.length - collapsedFreshnessRows.length;
  const visibleCategoryRows = summaryExpanded
    ? categoryRows
    : attentionCategoryRows.length > 0
      ? attentionCategoryRows
      : categoryRows.slice(0, 1);
  const generatedAt = overview?.generatedAt
    ? fDateTime(overview.generatedAt, EXACT_DATE_TIME_FORMAT)
    : '—';

  if (loading && !overview) {
    return (
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          {[1, 2, 3, 4].map((value) => (
            <Grid key={value} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rectangular" height={78} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  if (!overview) {
    return (
      <Box sx={{ mt: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => fetchOverview(true)}>
              重试
            </Button>
          }
        >
          {error || '暂无同步状态总览'}
        </Alert>
      </Box>
    );
  }

  const healthMeta = HEALTH_MAP[derivedHealth] ?? HEALTH_DEFAULT;

  return (
    <Box sx={{ mt: 3, pb: 3 }}>
      {loading && <LinearProgress aria-label="运行概览更新中" sx={{ mb: 1.5 }} />}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 1.5 }}
          action={
            <Button color="inherit" size="small" onClick={() => fetchOverview(true)}>
              重试
            </Button>
          }
        >
          {error}，当前展示上次成功快照（最后快照：{generatedAt}）。
        </Alert>
      )}

      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle1">运行概览</Typography>
          <Tooltip title={'服务端快照生成于 ' + generatedAt} placement="bottom-start">
            <Typography component="span" variant="caption" color="text.secondary">
              数据口径来自当前总览与日志接口 · 最后快照：{generatedAt}
            </Typography>
          </Tooltip>
        </Box>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          overflow: 'hidden',
          borderRadius: 1,
          bgcolor: 'background.neutral',
          border: (theme) => '1px solid ' + theme.vars.palette.divider,
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        <Box
          sx={{
            p: 1.5,
            minWidth: 0,
            borderLeft: (theme) => '3px solid ' + theme.vars.palette.primary.main,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            整体健康
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
            <Iconify icon={healthMeta.icon} sx={{ color: healthMeta.color + '.main', fontSize: 18 }} />
            <Typography variant="h6">{healthMeta.text}</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            基于任务最新状态
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            minWidth: 0,
            borderLeft: (theme) => '1px solid ' + theme.vars.palette.divider,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            同步任务总数
          </Typography>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 0.5 }}>
            <Typography variant="h6">{allItems.length}</Typography>
            <Typography variant="caption" color="text.secondary">
              成功 {totalSuccess} · 失败 {totalFailed} · 跳过 {totalSkipped}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            当前分类汇总
          </Typography>
        </Box>

        <Box
          sx={{
            p: 1.5,
            minWidth: 0,
            borderLeft: (theme) => '1px solid ' + theme.vars.palette.divider,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            最近同步
          </Typography>
          <Tooltip
            title={
              lastSyncOverall
                ? '最近同步：' + fDateTime(lastSyncOverall, EXACT_DATE_TIME_FORMAT)
                : '暂无同步记录'
            }
          >
            <Typography variant="h6" noWrap sx={{ mt: 0.5 }}>
              {lastSyncOverall ? fToNow(lastSyncOverall) : '—'}
            </Typography>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" noWrap>
            {lastSyncOverall
              ? fDateTime(lastSyncOverall, EXACT_DATE_TIME_FORMAT)
              : '暂无任务记录'}
          </Typography>
        </Box>

        <ButtonBase
          onClick={() => onGoLogs?.({ status: 'FAILED' })}
          aria-label={'查看 ' + failedTableNames.length + ' 个失败任务的同步日志'}
          disabled={!onGoLogs}
          sx={{
            p: 1.5,
            minWidth: 0,
            textAlign: 'left',
            alignItems: 'flex-start',
            flexDirection: 'column',
            borderLeft: (theme) => '1px solid ' + theme.vars.palette.divider,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Typography variant="caption" color="text.secondary">
            失败任务
          </Typography>
          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 0.5 }}>
            <Typography variant="h6" color={failedTableNames.length > 0 ? 'error.main' : 'text.primary'}>
              {failedTableNames.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {failedTableNames[0] ?? '当前无失败任务'}
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {failedTableNames.length > 1
              ? '另有 ' + (failedTableNames.length - 1) + ' 个失败任务'
              : '按最新状态统计'}
          </Typography>
        </ButtonBase>
      </Box>

      <Paper variant="outlined" sx={{ mt: 1.5, p: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle2">分类同步时效 · 前端估算</Typography>
            <Typography variant="caption" color="text.secondary">
              基于最近同步时间，不代表交易日 SLA。
            </Typography>
          </Box>
          {(freshnessExpanded || remainingCategoryCount > 0) && (
            <Button
              size="small"
              color="inherit"
              onClick={() => setFreshnessExpanded((value) => !value)}
            >
              {freshnessExpanded ? '收起正常分类' : '查看全部 ' + categoryRows.length + ' 个分类'}
            </Button>
          )}
        </Stack>

        {visibleFreshnessRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            暂无分类同步记录。
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />}>
            {visibleFreshnessRows.map((row) => {
              const attention = categoryAttentionMeta(row);

              return (
                <Box
                  key={row.category.name}
                  sx={{
                    gap: 1,
                    py: 1,
                    minWidth: 0,
                    display: 'grid',
                    alignItems: 'center',
                    gridTemplateColumns: {
                      xs: 'minmax(0, 1fr) auto',
                      md: 'minmax(160px, 1fr) minmax(96px, auto) minmax(160px, 1fr) minmax(128px, auto) auto',
                    },
                  }}
                >
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {row.category.name}
                  </Typography>
                  <Label color={row.freshness.color} variant="soft">
                    {row.freshness.label}
                  </Label>
                  <Tooltip
                    title={
                      row.lastSyncAt
                        ? '最近同步：' + fDateTime(row.lastSyncAt, EXACT_DATE_TIME_FORMAT)
                        : '暂无同步记录'
                    }
                  >
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {row.lastSyncAt ? fDateTime(row.lastSyncAt, 'YYYY-MM-DD HH:mm') : '—'}
                    </Typography>
                  </Tooltip>
                  <Label color={attention.color} variant="soft">
                    {attention.label}
                  </Label>
                  <Button
                    size="small"
                    variant="text"
                    onClick={onGoQuality}
                    disabled={!onGoQuality}
                    aria-label={'查看' + row.category.name + '数据缺口'}
                  >
                    数据缺口
                  </Button>
                </Box>
              );
            })}
          </Stack>
        )}
      </Paper>

      <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
            <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">今日同步动态 · 最多 8 条</Typography>
                <Typography variant="caption" color="text.secondary">
                  点击记录可带入任务、状态和日期筛选。
                </Typography>
              </Box>
              <Button size="small" variant="text" onClick={() => onGoLogs?.()}>
                查看日志
              </Button>
            </Stack>

            {timelineError && (
              <Alert
                severity="error"
                sx={{ mb: 1 }}
                action={
                  <Button color="inherit" size="small" onClick={fetchTimeline}>
                    重试
                  </Button>
                }
              >
                {timelineError}
                {timelineLogs.length > 0 ? '，当前展示上次成功快照。' : ''}
              </Alert>
            )}

            {timelineLoading && timelineLogs.length === 0 ? (
              <Skeleton variant="rectangular" height={132} sx={{ borderRadius: 1 }} />
            ) : !timelineError && timelineLogs.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                今日暂无同步记录。
              </Typography>
            ) : (
              <Stack spacing={0.25}>
                {timelineLogs.slice(0, 8).map((log) => {
                  const color = STATUS_COLOR[log.status] ?? 'default';
                  const detail = log.message || (STATUS_LABEL[log.status] ?? log.status) + '任务';

                  return (
                    <ButtonBase
                      key={log.id}
                      onClick={() =>
                        onGoLogs?.({
                          task: log.task,
                          status: log.status,
                          startDate: dayjs(log.startedAt).format('YYYY-MM-DD'),
                          endDate: dayjs(log.startedAt).format('YYYY-MM-DD'),
                        })
                      }
                      aria-label={'查看 ' + log.task + ' 同步日志'}
                      disabled={!onGoLogs}
                      sx={{
                        gap: 1,
                        px: 0.75,
                        minHeight: 40,
                        textAlign: 'left',
                        borderRadius: 0.75,
                        justifyContent: 'flex-start',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ width: 60, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {fDateTime(log.startedAt, 'HH:mm:ss')}
                      </Typography>
                      <Typography variant="body2" noWrap sx={{ width: 108, flexShrink: 0 }}>
                        {log.task}
                      </Typography>
                      <Tooltip title={detail}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                          sx={{ flexGrow: 1, minWidth: 0 }}
                        >
                          {detail}
                        </Typography>
                      </Tooltip>
                      <Label color={color} variant="soft">
                        {STATUS_LABEL[log.status] ?? log.status}
                      </Label>
                    </ButtonBase>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.5, py: 0.75 }}>
              <Typography variant="subtitle2">分类汇总</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                {categoryRows.length} 个分类
              </Typography>
              {categoryRows.length > 1 && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => setSummaryExpanded((value) => !value)}
                  endIcon={
                    <Iconify
                      icon={
                        summaryExpanded
                          ? 'solar:alt-arrow-up-bold'
                          : 'solar:alt-arrow-down-bold'
                      }
                    />
                  }
                >
                  {summaryExpanded ? '收起' : '展开全部'}
                </Button>
              )}
            </Stack>
            <Divider />
            <Box sx={{ overflowX: 'auto' }}>
              <Table
                size="small"
                sx={{
                  minWidth: 720,
                  '& .MuiTableCell-root': { py: 0.75 },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>类别</TableCell>
                    <TableCell align="center">任务数</TableCell>
                    <TableCell align="center">成功</TableCell>
                    <TableCell align="center">失败</TableCell>
                    <TableCell align="center">跳过</TableCell>
                    <TableCell>最近同步</TableCell>
                    <TableCell align="center">连续失败</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleCategoryRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          暂无分类汇总。
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleCategoryRows.map((row) => {
                      const category = row.category;
                      const success = category.items.filter(
                        (item) => item.lastStatus === 'SUCCESS'
                      ).length;
                      const skipped = category.items.filter(
                        (item) => item.lastStatus === 'SKIPPED'
                      ).length;

                      return (
                        <TableRow key={category.name}>
                          <TableCell>
                            <Label color="default" variant="soft">
                              {category.name}
                            </Label>
                          </TableCell>
                          <TableCell align="center">{category.items.length}</TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              sx={{ color: success > 0 ? 'success.main' : 'text.secondary' }}
                            >
                              {success}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              sx={{
                                color: row.failedCount > 0 ? 'error.main' : 'text.primary',
                              }}
                            >
                              {row.failedCount}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{skipped}</TableCell>
                          <TableCell>
                            <Tooltip
                              title={
                                row.lastSyncAt
                                  ? fDateTime(row.lastSyncAt, EXACT_DATE_TIME_FORMAT)
                                  : '暂无同步记录'
                              }
                            >
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {row.lastSyncAt
                                  ? fDateTime(row.lastSyncAt, 'YYYY-MM-DD HH:mm')
                                  : '—'}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            {row.consecutiveFailures > 0 ? (
                              <Label
                                color={row.consecutiveFailures >= 3 ? 'error' : 'warning'}
                                variant="soft"
                              >
                                {row.consecutiveFailures}
                              </Label>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                0
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
