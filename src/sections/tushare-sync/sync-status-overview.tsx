import type { IconifyName } from 'src/components/iconify/register-icons';
import type { SyncLogItem, SyncStatusOverview } from 'src/api/tushare-sync';

import dayjs from 'dayjs';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import ButtonBase from '@mui/material/ButtonBase';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { fToNow, fDateTime } from 'src/utils/format-time';

import { tushareSyncApi, TUSHARE_SYNC_LOG_MAX_PAGE_SIZE } from 'src/api/tushare-sync';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

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
  activeCells: number;
} {
  if (lagDays === null) return { label: '未知', color: 'default', activeCells: 1 };
  if (lagDays <= 0) return { label: '当日', color: 'success', activeCells: 5 };
  if (lagDays <= 1) return { label: 'T-1', color: 'info', activeCells: 4 };
  if (lagDays <= 3) return { label: `落后 ${lagDays} 天`, color: 'warning', activeCells: 3 };
  if (lagDays <= 7) return { label: `落后 ${lagDays} 天`, color: 'warning', activeCells: 2 };
  return { label: `落后 ${lagDays} 天`, color: 'error', activeCells: 1 };
}

// ----------------------------------------------------------------------

export function SyncStatusOverviewPanel({ refreshKey = 0, onGoLogs, onGoQuality }: Props) {
  const [overview, setOverview] = useState<SyncStatusOverview | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<SyncLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelineError, setTimelineError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
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

  const allItems = overview?.categories?.flatMap((c) => c.items) ?? [];
  const totalSuccess = allItems.filter((i) => i.lastStatus === 'SUCCESS').length;
  const totalFailed = allItems.filter((i) => i.lastStatus === 'FAILED').length;
  const totalSkipped = allItems.filter((i) => i.lastStatus === 'SKIPPED').length;

  // 从实际数据推算整体健康状态
  const anyConsecFail3 = allItems.some((i) => i.consecutiveFailures >= 3);
  const anyFailed = allItems.some((i) => i.lastStatus === 'FAILED' || i.consecutiveFailures > 0);
  const derivedHealth = anyConsecFail3 ? 'unhealthy' : anyFailed ? 'degraded' : 'healthy';

  // 最近同步时间（全局最新）
  const lastSyncOverall = allItems.reduce<string | null>((max, i) => {
    if (!i.lastSyncAt) return max;
    return !max || i.lastSyncAt > max ? i.lastSyncAt : max;
  }, null);

  // 失败任务名称列表
  const failedTableNames = allItems
    .filter((i) => i.lastStatus === 'FAILED')
    .map((i) => i.displayName || i.tableName);

  const categoryRows = overview?.categories ?? [];
  const visibleCategoryRows = summaryExpanded ? categoryRows : categoryRows.slice(0, 1);
  const generatedAt = overview?.generatedAt
    ? fDateTime(overview.generatedAt, EXACT_DATE_TIME_FORMAT)
    : '—';

  return (
    <Card sx={{ mb: 2, overflow: 'hidden' }}>
      <CardHeader
        title="状态总览"
        titleTypographyProps={{ variant: 'subtitle1' }}
        subheader={
          <Tooltip title={`服务端快照生成于 ${generatedAt}`} placement="bottom-start">
            <Typography component="span" variant="caption" color="text.secondary">
              数据口径来自当前总览与日志接口 · 最后快照：{generatedAt}
            </Typography>
          </Tooltip>
        }
        sx={{ py: 1.25, px: 2 }}
        action={
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              onClick={() => fetchOverview(true)}
              startIcon={<Iconify icon="solar:refresh-bold" />}
            >
              刷新总览
            </Button>
            <Tooltip title={collapsed ? '展开同步状态总览' : '折叠同步状态总览'}>
              <IconButton
                size="small"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? '展开同步状态总览' : '折叠同步状态总览'}
              >
                <Iconify
                  icon={collapsed ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-up-bold'}
                />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      <Collapse in={!collapsed}>
        {loading && !overview ? (
          <Box sx={{ p: 2 }}>
            <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
              {[1, 2, 3, 4].map((i) => (
                <Grid key={i} size={{ xs: 6, md: 3 }}>
                  <Skeleton variant="rectangular" height={78} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
            <Skeleton variant="rectangular" height={176} sx={{ borderRadius: 1 }} />
          </Box>
        ) : !overview ? (
          <Box sx={{ p: 2 }}>
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
        ) : (
          <Box sx={{ px: { xs: 1.5, md: 2 }, pb: 2 }}>
              {loading && <LinearProgress aria-label="状态总览更新中" sx={{ mb: 1.5 }} />}
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
              <Box
                sx={{
                  display: 'grid',
                  overflow: 'hidden',
                  borderRadius: 1,
                  bgcolor: 'background.neutral',
                  border: (theme) => `1px solid ${theme.vars.palette.divider}`,
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
                }}
              >
                <Box
                  sx={{
                    p: 1.5,
                    minWidth: 0,
                    borderLeft: (theme) => `3px solid ${theme.vars.palette.primary.main}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    整体健康
                  </Typography>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                    <Iconify
                      icon={(HEALTH_MAP[derivedHealth] ?? HEALTH_DEFAULT).icon}
                      sx={{
                        color: `${(HEALTH_MAP[derivedHealth] ?? HEALTH_DEFAULT).color}.main`,
                        fontSize: 18,
                      }}
                    />
                    <Typography variant="h6">
                      {(HEALTH_MAP[derivedHealth] ?? HEALTH_DEFAULT).text}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    基于任务最新状态
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: 1.5,
                    minWidth: 0,
                    borderLeft: (theme) => `1px solid ${theme.vars.palette.divider}`,
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
                    borderLeft: (theme) => `1px solid ${theme.vars.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    最近同步
                  </Typography>
                  <Tooltip
                    title={
                      lastSyncOverall
                        ? `最近同步：${fDateTime(lastSyncOverall, EXACT_DATE_TIME_FORMAT)}`
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

                <Box
                  sx={{
                    p: 1.5,
                    minWidth: 0,
                    borderLeft: (theme) => `1px solid ${theme.vars.palette.divider}`,
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
                    {failedTableNames.length > 1 ? `另有 ${failedTableNames.length - 1} 个失败任务` : '按最新状态统计'}
                  </Typography>
                </Box>
              </Box>

              <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                    <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2">分类保鲜度 · 前端估算</Typography>
                        <Typography variant="caption" color="text.secondary">
                          基于最近同步时间，不代表交易日 SLA。
                        </Typography>
                      </Box>
                      <Button size="small" variant="text" onClick={onGoQuality}>
                        查看数据缺口
                      </Button>
                    </Stack>
                    <Scrollbar fillContent={false} sx={{ maxHeight: 164 }}>
                      <Box
                        sx={{
                          gap: 0.75,
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(1, minmax(0, 1fr))',
                            sm: 'repeat(2, minmax(0, 1fr))',
                            md: 'repeat(3, minmax(0, 1fr))',
                            xl: 'repeat(4, minmax(0, 1fr))',
                          },
                        }}
                      >
                        {categoryRows.map((cat) => {
                          const catLastSync = cat.items.reduce<string | null>((max, item) => {
                            if (!item.lastSyncAt) return max;
                            return !max || item.lastSyncAt > max ? item.lastSyncAt : max;
                          }, null);
                          const lagDays = catLastSync
                            ? dayjs().startOf('day').diff(dayjs(catLastSync).startOf('day'), 'day')
                            : null;
                          const meta = freshnessMeta(lagDays);

                          return (
                            <ButtonBase
                              key={cat.name}
                              onClick={onGoQuality}
                              aria-label={`查看${cat.name}数据缺口`}
                              disabled={!onGoQuality}
                              sx={{
                                p: 1,
                                gap: 0.5,
                                minWidth: 0,
                                minHeight: 50,
                                borderRadius: 0.75,
                                alignItems: 'flex-start',
                                flexDirection: 'column',
                                border: (theme) => `1px solid ${theme.vars.palette.divider}`,
                                '&:hover': {
                                  borderColor: onGoQuality ? `${meta.color}.main` : 'divider',
                                },
                              }}
                            >
                              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: 1, minWidth: 0 }}>
                                <Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0 }}>
                                  {cat.name}
                                </Typography>
                                <Label color={meta.color} variant="soft">
                                  {meta.label}
                                </Label>
                              </Stack>
                              <Tooltip
                                title={
                                  catLastSync
                                    ? `最近同步：${fDateTime(catLastSync, EXACT_DATE_TIME_FORMAT)}`
                                    : '暂无同步记录'
                                }
                              >
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  最近同步：{catLastSync ? fDateTime(catLastSync, 'MM-DD HH:mm') : '—'}
                                </Typography>
                              </Tooltip>
                            </ButtonBase>
                          );
                        })}
                      </Box>
                    </Scrollbar>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, lg: 6 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, height: '100%' }}>
                    <Stack direction="row" alignItems="center" sx={{ mb: 1 }}>
                      <Box sx={{ flexGrow: 1 }}>
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
                      <Scrollbar fillContent={false} sx={{ maxHeight: 164 }}>
                        <Stack spacing={0.25}>
                          {timelineLogs.slice(0, 8).map((log) => {
                            const color = STATUS_COLOR[log.status] ?? 'default';
                            const detail = log.message || `${STATUS_LABEL[log.status] ?? log.status}任务`;

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
                                aria-label={`查看 ${log.task} 同步日志`}
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
                      </Scrollbar>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ mt: 1.5, overflow: 'hidden' }}>
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
                      endIcon={<Iconify icon={summaryExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'} />}
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
                      {visibleCategoryRows.map((cat) => {
                        const catSuccess = cat.items.filter((item) => item.lastStatus === 'SUCCESS').length;
                        const catFailed = cat.items.filter((item) => item.lastStatus === 'FAILED').length;
                        const catSkipped = cat.items.filter((item) => item.lastStatus === 'SKIPPED').length;
                        const catLastSync = cat.items.reduce<string | null>((max, item) => {
                          if (!item.lastSyncAt) return max;
                          return !max || item.lastSyncAt > max ? item.lastSyncAt : max;
                        }, null);
                        const catConsecFail = cat.items.reduce(
                          (sum, item) => sum + (item.consecutiveFailures || 0),
                          0
                        );

                        return (
                          <TableRow key={cat.name}>
                            <TableCell>
                              <Label color="default" variant="soft">
                                {cat.name}
                              </Label>
                            </TableCell>
                            <TableCell align="center">{cat.items.length}</TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                sx={{ color: catSuccess > 0 ? 'success.main' : 'text.secondary' }}
                              >
                                {catSuccess}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Typography
                                variant="body2"
                                sx={{ color: catFailed > 0 ? 'error.main' : 'text.primary' }}
                              >
                                {catFailed}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">{catSkipped}</TableCell>
                            <TableCell>
                              <Tooltip
                                title={
                                  catLastSync
                                    ? fDateTime(catLastSync, EXACT_DATE_TIME_FORMAT)
                                    : '暂无同步记录'
                                }
                              >
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {catLastSync ? fDateTime(catLastSync, 'YYYY-MM-DD HH:mm') : '—'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              {catConsecFail > 0 ? (
                                <Label color={catConsecFail >= 3 ? 'error' : 'warning'} variant="soft">
                                  {catConsecFail}
                                </Label>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  0
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Box>
        )}
      </Collapse>
    </Card>
  );
}
