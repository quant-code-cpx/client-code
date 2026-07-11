import type { CacheMetricsData } from 'src/api/tushare-sync';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

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
  }, [fetchStats, refreshKey]);

  const namespaces = cacheData?.namespaces ?? [];
  const filteredNamespaces = namespaces.filter((item) =>
    item.namespace.toLowerCase().includes(keyword.trim().toLowerCase())
  );
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
          : filteredNamespaces.map((ns) => (
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
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', display: 'block' }}
                      >
                        键数
                      </Typography>
                      <Typography variant="body2">{ns.keyCount.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', display: 'block' }}
                      >
                        命中
                      </Typography>
                      <Typography variant="body2">{ns.hits.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', display: 'block' }}
                      >
                        未命中
                      </Typography>
                      <Typography variant="body2">{ns.misses.toLocaleString()}</Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.disabled', display: 'block' }}
                      >
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
        <CacheStatsTable
          rows={filteredNamespaces}
          loading={loading}
          clearDisabled
          clearDisabledReason={clearDisabledReason}
        />
      </Card>
    </Box>
  );
}
