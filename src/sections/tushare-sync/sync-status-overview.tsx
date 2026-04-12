import type { IconifyName } from 'src/components/iconify/register-icons';
import type { SyncStatusOverview, TushareSyncCategory } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Collapse from '@mui/material/Collapse';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { fToNow } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';

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

const CATEGORY_LABEL: Record<TushareSyncCategory, string> = {
  basic: '基础数据',
  market: '行情数据',
  financial: '财务数据',
  moneyflow: '资金流向',
  factor: '因子数据',
  alternative: '另类数据',
};

// ----------------------------------------------------------------------

export function SyncStatusOverviewPanel() {
  const [overview, setOverview] = useState<SyncStatusOverview | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const totalSuccess = overview?.categories?.reduce((s, c) => s + c.successCount, 0) ?? 0;
  const totalFailed = overview?.categories?.reduce((s, c) => s + c.failedCount, 0) ?? 0;
  const totalSkipped = overview?.categories?.reduce((s, c) => s + c.skippedCount, 0) ?? 0;

  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title="状态总览"
        titleTypographyProps={{ variant: 'subtitle1' }}
        action={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton size="small" onClick={fetchOverview}>
              <Iconify icon="solar:refresh-bold" />
            </IconButton>
            <IconButton size="small" onClick={() => setCollapsed((v) => !v)}>
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
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {/* 1. 整体健康状态 */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Iconify
                      icon={(HEALTH_MAP[overview.healthStatus] ?? HEALTH_DEFAULT).icon}
                      sx={{
                        fontSize: 32,
                        color: `${(HEALTH_MAP[overview.healthStatus] ?? HEALTH_DEFAULT).color}.main`,
                        mb: 1,
                        display: 'block',
                        mx: 'auto',
                      }}
                    />
                    <Typography variant="h6">
                      {(HEALTH_MAP[overview.healthStatus] ?? HEALTH_DEFAULT).text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      整体健康状态
                    </Typography>
                  </Paper>
                </Grid>

                {/* 2. 任务统计 */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h4">{overview.totalTasks}</Typography>
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
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      最近同步
                    </Typography>
                    <Typography variant="body2">
                      增量：
                      {overview.lastIncrementalSyncAt
                        ? fToNow(overview.lastIncrementalSyncAt)
                        : '—'}
                    </Typography>
                    <Typography variant="body2">
                      全量：
                      {overview.lastFullSyncAt ? fToNow(overview.lastFullSyncAt) : '—'}
                    </Typography>
                  </Paper>
                </Grid>

                {/* 4. 失败告警 */}
                <Grid size={{ xs: 6, md: 3 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderColor: (overview.failedTaskNames ?? []).length > 0 ? 'error.main' : 'divider',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      失败任务 ({(overview.failedTaskNames ?? []).length})
                    </Typography>
                    {(overview.failedTaskNames ?? []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        无
                      </Typography>
                    ) : (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(overview.failedTaskNames ?? []).slice(0, 5).map((name) => (
                          <Label key={name} color="error" variant="soft">
                            {name}
                          </Label>
                        ))}
                        {(overview.failedTaskNames ?? []).length > 5 && (
                          <Typography variant="caption" color="text.secondary">
                            +{(overview.failedTaskNames ?? []).length - 5} 更多
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>

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
                  {(overview.categories ?? []).map((cat) => (
                    <TableRow key={cat.category}>
                      <TableCell>
                        <Label color="default" variant="soft">
                          {CATEGORY_LABEL[cat.category] ?? cat.category}
                        </Label>
                      </TableCell>
                      <TableCell align="center">{cat.totalTasks}</TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{ color: cat.successCount > 0 ? 'success.main' : 'text.secondary' }}
                        >
                          {cat.successCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{ color: cat.failedCount > 0 ? 'error.main' : 'text.primary' }}
                        >
                          {cat.failedCount}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{cat.skippedCount}</TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {cat.lastSyncAt ? fToNow(cat.lastSyncAt) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {cat.consecutiveFailures > 0 ? (
                          <Label
                            color={cat.consecutiveFailures >= 3 ? 'error' : 'warning'}
                            variant="soft"
                          >
                            {cat.consecutiveFailures}
                          </Label>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            0
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )
        )}
      </Collapse>
    </Card>
  );
}
