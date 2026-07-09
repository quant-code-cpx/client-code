import type { IconifyName } from 'src/components/iconify/register-icons';
import type { SyncLogItem, SyncStatusOverview } from 'src/api/tushare-sync';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
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

import { fToNow } from 'src/utils/format-time';

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

type Props = {
  refreshKey?: number;
  onGoLogs?: () => void;
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

function getTimelineMetrics(log: SyncLogItem) {
  const start = dayjs(log.startedAt);
  const end = log.finishedAt ? dayjs(log.finishedAt) : dayjs();
  const startMinute = start.hour() * 60 + start.minute();
  const durationMinute = Math.max(end.diff(start, 'minute'), 8);
  return {
    left: Math.min(96, Math.max(0, (startMinute / 1440) * 100)),
    width: Math.min(100, Math.max(2, (durationMinute / 1440) * 100)),
  };
}

// ----------------------------------------------------------------------

export function SyncStatusOverviewPanel({ refreshKey = 0, onGoLogs, onGoQuality }: Props) {
  const [overview, setOverview] = useState<SyncStatusOverview | null>(null);
  const [timelineLogs, setTimelineLogs] = useState<SyncLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tushareSyncApi.getSyncStatusOverview();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取同步状态总览失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const result = await tushareSyncApi.getSyncLogs({
        startDate: dayjs().format('YYYY-MM-DD'),
        page: 1,
        pageSize: TUSHARE_SYNC_LOG_MAX_PAGE_SIZE,
      });
      setTimelineLogs(result.items ?? []);
    } catch {
      setTimelineLogs([]);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
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

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="状态总览"
        titleTypographyProps={{ variant: 'subtitle1' }}
        action={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={fetchOverview} aria-label="刷新同步状态总览">
              <Iconify icon="solar:refresh-bold" />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? '展开同步状态总览' : '折叠同步状态总览'}
            >
              <Iconify icon={collapsed ? 'solar:alt-arrow-down-bold' : 'solar:alt-arrow-up-bold'} />
            </IconButton>
          </Box>
        }
      />

      <Collapse in={!collapsed}>
        <Divider />

        {loading ? (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {[1, 2, 3, 4].map((i) => (
                <Grid key={i} size={{ xs: 6, md: 3 }}>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1 }} />
                </Grid>
              ))}
            </Grid>
            <Skeleton height={200} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={fetchOverview}>
                  重试
                </Button>
              }
            >
              {error}
            </Alert>
          </Box>
        ) : (
          overview && (
            <Box sx={{ p: 3 }}>
              {/* 四张统计卡片 */}
              <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3 }}>
                {/* 1. 整体健康状态 */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <Iconify
                      icon={(HEALTH_MAP[derivedHealth] ?? HEALTH_DEFAULT).icon}
                      sx={{
                        fontSize: 32,
                        color: `${(HEALTH_MAP[derivedHealth] ?? HEALTH_DEFAULT).color}.main`,
                        mb: 1,
                        display: 'block',
                        mx: 'auto',
                      }}
                    />
                    <Typography variant="h6">
                      {(HEALTH_MAP[derivedHealth] ?? HEALTH_DEFAULT).text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      整体健康状态
                    </Typography>
                  </Paper>
                </Grid>

                {/* 2. 任务统计 */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <Typography variant="h4">{allItems.length}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      同步任务总数
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 0.5,
                        mt: 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Label color="success" variant="soft">
                        ✅ {totalSuccess}
                      </Label>
                      <Label color="error" variant="soft">
                        ❌ {totalFailed}
                      </Label>
                      <Label color="default" variant="soft">
                        ⏭ {totalSkipped}
                      </Label>
                    </Box>
                  </Paper>
                </Grid>

                {/* 3. 最近同步 */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      最近同步
                    </Typography>
                    <Typography variant="body2">
                      {lastSyncOverall ? fToNow(lastSyncOverall) : '—'}
                    </Typography>
                  </Paper>
                </Grid>

                {/* 4. 失败告警 */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      height: '100%',
                      borderColor: failedTableNames.length > 0 ? 'error.main' : 'divider',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      失败任务 ({failedTableNames.length})
                    </Typography>
                    {failedTableNames.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        无
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {failedTableNames.slice(0, 5).map((name) => (
                          <Label key={name} color="error" variant="soft">
                            {name}
                          </Label>
                        ))}
                        {failedTableNames.length > 5 && (
                          <Typography variant="caption" color="text.secondary">
                            +{failedTableNames.length - 5} 更多
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* 数据保鲜度热条（基于现有 lastSyncAt 的前端估算版） */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  sx={{ mb: 1.5 }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2">分类保鲜度（前端估算）</Typography>
                    <Typography variant="caption" color="text.secondary">
                      基于分类最近同步时间推断；后端 freshness 接口就绪后切换为最新 trade_date。
                    </Typography>
                  </Box>
                  <Button size="small" variant="text" onClick={onGoQuality}>
                    查看数据缺口
                  </Button>
                </Stack>
                <Grid container spacing={1.5}>
                  {(overview.categories ?? []).map((cat) => {
                    const catLastSync = cat.items.reduce<string | null>((max, i) => {
                      if (!i.lastSyncAt) return max;
                      return !max || i.lastSyncAt > max ? i.lastSyncAt : max;
                    }, null);
                    const lagDays = catLastSync
                      ? dayjs().startOf('day').diff(dayjs(catLastSync).startOf('day'), 'day')
                      : null;
                    const meta = freshnessMeta(lagDays);

                    return (
                      <Grid key={cat.name} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                        <ButtonBase
                          onClick={onGoQuality}
                          sx={{
                            width: 1,
                            borderRadius: 1,
                            textAlign: 'left',
                            display: 'block',
                          }}
                          disabled={!onGoQuality}
                        >
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.25,
                              '&:hover': {
                                borderColor: onGoQuality ? `${meta.color}.main` : 'divider',
                              },
                            }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                            >
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {cat.name}
                              </Typography>
                              <Label color={meta.color} variant="soft">
                                {meta.label}
                              </Label>
                            </Stack>
                            <Stack direction="row" spacing={0.5} sx={{ mt: 1 }}>
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Box
                                  key={index}
                                  sx={{
                                    width: 1,
                                    height: 8,
                                    borderRadius: 0.75,
                                    bgcolor:
                                      index < meta.activeCells
                                        ? `${meta.color}.main`
                                        : 'background.neutral',
                                  }}
                                />
                              ))}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              最近同步：{catLastSync ? fToNow(catLastSync) : '—'}
                            </Typography>
                          </Paper>
                        </ButtonBase>
                      </Grid>
                    );
                  })}
                </Grid>
              </Paper>

              {/* 今日同步时间线（轻量版） */}
              <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                  sx={{ mb: 2 }}
                >
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2">今日同步时间线</Typography>
                    <Typography variant="caption" color="text.secondary">
                      按今天同步日志生成，点击可跳转同步日志筛选。
                    </Typography>
                  </Box>
                  <Button size="small" variant="text" onClick={onGoLogs}>
                    查看日志
                  </Button>
                </Stack>

                {timelineLoading ? (
                  <Skeleton variant="rectangular" height={132} sx={{ borderRadius: 1 }} />
                ) : timelineLogs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    今日暂无同步记录。
                  </Typography>
                ) : (
                  <Stack spacing={1.25}>
                    {timelineLogs.slice(0, 8).map((log) => {
                      const metrics = getTimelineMetrics(log);
                      const color = STATUS_COLOR[log.status] ?? 'default';

                      return (
                        <ButtonBase
                          key={log.id}
                          onClick={onGoLogs}
                          disabled={!onGoLogs}
                          sx={{ width: 1, borderRadius: 1, textAlign: 'left', display: 'block' }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ width: 112, flexShrink: 0 }}
                            >
                              {log.task}
                            </Typography>
                            <Box
                              sx={{
                                height: 16,
                                flexGrow: 1,
                                minWidth: 160,
                                borderRadius: 1,
                                position: 'relative',
                                bgcolor: 'background.neutral',
                              }}
                            >
                              <Box
                                title={`${log.task} · ${log.status}`}
                                sx={{
                                  top: 2,
                                  bottom: 2,
                                  left: `${metrics.left}%`,
                                  width: `${metrics.width}%`,
                                  minWidth: 12,
                                  borderRadius: 0.75,
                                  position: 'absolute',
                                  bgcolor: `${color}.main`,
                                }}
                              />
                            </Box>
                            <Label color={color} variant="soft">
                              {log.status}
                            </Label>
                          </Stack>
                        </ButtonBase>
                      );
                    })}
                    {timelineLogs.length > 8 && (
                      <Typography variant="caption" color="text.secondary">
                        仅展示最近 8 条，更多记录请进入同步日志。
                      </Typography>
                    )}
                  </Stack>
                )}
              </Paper>

              {/* 分类别状态表格 */}
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                分类别状态
              </Typography>
              <Table size="small">
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
                  {(overview.categories ?? []).map((cat) => {
                    const catSuccess = cat.items.filter((i) => i.lastStatus === 'SUCCESS').length;
                    const catFailed = cat.items.filter((i) => i.lastStatus === 'FAILED').length;
                    const catSkipped = cat.items.filter((i) => i.lastStatus === 'SKIPPED').length;
                    const catLastSync = cat.items.reduce<string | null>((max, i) => {
                      if (!i.lastSyncAt) return max;
                      return !max || i.lastSyncAt > max ? i.lastSyncAt : max;
                    }, null);
                    const catConsecFail = cat.items.reduce(
                      (sum, i) => sum + (i.consecutiveFailures || 0),
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
                          <Typography variant="body2" color="text.secondary">
                            {catLastSync ? fToNow(catLastSync) : '—'}
                          </Typography>
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
          )
        )}
      </Collapse>
    </Card>
  );
}
