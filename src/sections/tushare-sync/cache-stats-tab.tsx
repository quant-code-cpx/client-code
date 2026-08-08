import type { CacheMetricsData } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { fDateTime } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Iconify } from 'src/components/iconify';

import { CacheStatsTable } from './cache-stats-table';

// ----------------------------------------------------------------------

type Props = {
  isReadOnly?: boolean;
  refreshKey?: number;
};

export function CacheStatsTab({ isReadOnly = false, refreshKey = 0 }: Props) {
  const [cacheData, setCacheData] = useState<CacheMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await tushareSyncApi.getCacheStats();
      setCacheData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取缓存统计失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const namespaces = cacheData?.namespaces ?? [];
  const filteredNamespaces = namespaces.filter((item) =>
    item.namespace.toLowerCase().includes(keyword.trim().toLowerCase())
  );
  const totalKeys = namespaces.reduce((sum, item) => sum + item.keyCount, 0);
  const totalHits = namespaces.reduce((sum, item) => sum + item.hits, 0);
  const totalMisses = namespaces.reduce((sum, item) => sum + item.misses, 0);
  const totalWrites = namespaces.reduce((sum, item) => sum + item.writes, 0);
  const totalInvalidations = namespaces.reduce((sum, item) => sum + item.invalidations, 0);
  const requestCount = totalHits + totalMisses;
  const overallHitRate = requestCount > 0 ? (totalHits / requestCount) * 100 : null;
  const clearDisabledReason = isReadOnly ? '仅超级管理员可执行' : '等待后端缓存清理接口启用';

  return (
    <Box sx={{ mt: 3 }}>
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
          缓存命中率统计
          {cacheData?.generatedAt && (
            <Typography component="span" variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
              统计时间：{fDateTime(cacheData.generatedAt)}
            </Typography>
          )}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={fetchStats}
          disabled={loading}
          loading={loading}
          startIcon={<Iconify icon="solar:refresh-bold" />}
        >
          {loading ? '加载中…' : '刷新'}
        </Button>
        <Tooltip title={clearDisabledReason}>
          <span>
            <Button variant="outlined" color="warning" size="small" disabled>
              清除全部缓存
            </Button>
          </span>
        </Tooltip>
      </Box>

      <TextField
        fullWidth
        size="small"
        label="按命名空间搜索"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        sx={{ mb: 3 }}
      />

      {loading && cacheData && <LinearProgress aria-label="缓存统计更新中" sx={{ mb: 2 }} />}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchStats}>
              重试
            </Button>
          }
        >
          {error}
          {cacheData ? '，当前展示上次成功快照。' : ''}
        </Alert>
      )}

      {/* Overview cards */}
      {(!error || cacheData) && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading && !cacheData
          ? Array.from({ length: 3 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ p: 3 }}>
                  <Skeleton variant="rectangular" height={80} />
                </Card>
              </Grid>
            ))
          : [
              { label: '缓存键总数', value: totalKeys.toLocaleString(), color: 'text.primary' },
              {
                label: '全局命中率',
                value: overallHitRate === null ? '—' : `${overallHitRate.toFixed(1)}%`,
                color:
                  overallHitRate === null
                    ? 'text.disabled'
                    : overallHitRate >= 80
                      ? 'success.main'
                      : overallHitRate >= 50
                        ? 'warning.main'
                        : 'error.main',
              },
              {
                label: '写入 / 失效',
                value: `${totalWrites.toLocaleString()} / ${totalInvalidations.toLocaleString()}`,
                color: 'text.primary',
              },
            ].map((item) => (
              <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h5" sx={{ color: item.color, fontVariantNumeric: 'tabular-nums' }}>
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      {/* Detail table */}
      <Card>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            详细统计表格
          </Typography>
        </Box>
        <Divider />
        {(!error || cacheData) && (
          <CacheStatsTable
            rows={filteredNamespaces}
            loading={loading && !cacheData}
            clearDisabled
            clearDisabledReason={clearDisabledReason}
          />
        )}
      </Card>
    </Box>
  );
}
