import type { CacheMetricsData } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { fDateTime } from 'src/utils/format-time';

import { tushareSyncApi } from 'src/api/tushare-sync';

import { Iconify } from 'src/components/iconify';

import { CacheStatsTable } from './cache-stats-table';

// ----------------------------------------------------------------------

export function CacheStatsTab() {
  const [cacheData, setCacheData] = useState<CacheMetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tushareSyncApi.getCacheStats();
      setCacheData(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const namespaces = cacheData?.namespaces ?? [];

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
            <Typography
              component="span"
              variant="body2"
              sx={{ ml: 2, color: 'text.secondary' }}
            >
              统计时间：{fDateTime(cacheData.generatedAt)}
            </Typography>
          )}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={fetchStats}
          disabled={loading}
          startIcon={
            loading ? (
              <CircularProgress size={14} />
            ) : (
              <Iconify icon="solar:refresh-bold" />
            )
          }
        >
          {loading ? '加载中...' : '刷新'}
        </Button>
      </Box>

      {/* Overview cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ p: 3 }}>
                  <Skeleton variant="rectangular" height={80} />
                </Card>
              </Grid>
            ))
          : namespaces.map((ns) => (
              <Grid key={ns.namespace} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card sx={{ p: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                    {ns.namespace}
                  </Typography>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color:
                        ns.hitRate === null
                          ? 'text.disabled'
                          : ns.hitRate >= 80
                            ? 'success.main'
                            : ns.hitRate >= 50
                              ? 'warning.main'
                              : 'error.main',
                    }}
                  >
                    {ns.hitRate !== null ? `${ns.hitRate.toFixed(1)}%` : '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    命中率
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        键数
                      </Typography>
                      <Typography variant="body2">{ns.keyCount.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        命中
                      </Typography>
                      <Typography variant="body2">{ns.hits.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        未命中
                      </Typography>
                      <Typography variant="body2">{ns.misses.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>
                        写入
                      </Typography>
                      <Typography variant="body2">{ns.writes.toLocaleString()}</Typography>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
      </Grid>

      {/* Detail table */}
      <Card>
        <Box sx={{ px: 3, py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            详细统计表格
          </Typography>
        </Box>
        <Divider />
        <CacheStatsTable rows={namespaces} loading={loading} />
      </Card>
    </Box>
  );
}
