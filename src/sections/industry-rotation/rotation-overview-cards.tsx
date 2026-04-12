import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchRotationOverview, type RotationOverviewResult } from 'src/api/market';

// ----------------------------------------------------------------------

type Props = {
  tradeDate?: string;
  period?: string;
};

export function RotationOverviewCards({ tradeDate, period }: Props) {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RotationOverviewResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchRotationOverview({ trade_date: tradeDate })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '数据加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tradeDate, period]);

  const riseRatio =
    data && data.totalCount > 0 ? Math.round((data.riseCount / data.totalCount) * 100) : 0;

  const avgColor = !data
    ? theme.palette.text.secondary
    : data.avgPctChange > 0
      ? theme.palette.error.main
      : data.avgPctChange < 0
        ? theme.palette.success.main
        : theme.palette.text.secondary;

  return (
    <>
      {error && (
        <Grid size={12}>
          <Alert severity="error">{error}</Alert>
        </Grid>
      )}

      {/* 卡片 1 — 行业涨跌比 */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            {loading ? (
              <Skeleton variant="rectangular" height={100} />
            ) : (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  行业涨跌比
                </Typography>
                <Typography variant="h4" sx={{ color: 'error.main' }}>
                  {data?.riseCount ?? '--'}
                  <Typography
                    component="span"
                    variant="h6"
                    sx={{ color: 'text.secondary', mx: 0.5 }}
                  >
                    /
                  </Typography>
                  <Typography component="span" variant="h4" sx={{ color: 'success.main' }}>
                    {data?.fallCount ?? '--'}
                  </Typography>
                </Typography>
                <Box
                  sx={{
                    mt: 1.5,
                    height: 8,
                    borderRadius: 1,
                    bgcolor: 'success.lighter',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      height: '100%',
                      width: `${riseRatio}%`,
                      bgcolor: 'error.main',
                      borderRadius: 1,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  上涨 {data?.riseCount ?? 0} / 下跌 {data?.fallCount ?? 0}（共{' '}
                  {data?.totalCount ?? 0} 个行业）
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* 卡片 2 — 全行业平均涨跌幅 */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            {loading ? (
              <Skeleton variant="rectangular" height={100} />
            ) : (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  全行业平均涨跌幅
                </Typography>
                <Typography variant="h4" sx={{ color: avgColor }}>
                  {data?.avgPctChange != null
                    ? `${data.avgPctChange > 0 ? '+' : ''}${data.avgPctChange.toFixed(2)}%`
                    : '--'}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block' }}
                >
                  {data?.tradeDate ?? '最新交易日'} · {data?.period ?? period ?? '1m'} 区间
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* 卡片 3 — 领涨行业 Top 3 */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            {loading ? (
              <Skeleton variant="rectangular" height={100} />
            ) : (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  领涨行业 Top 3
                </Typography>
                {(data?.topGainers ?? []).slice(0, 3).map((item) => (
                  <Box
                    key={item.name}
                    sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}
                  >
                    <Typography variant="body2">{item.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                      {item.pctChange > 0 ? '+' : ''}
                      {item.pctChange.toFixed(2)}%
                    </Typography>
                  </Box>
                ))}
                {(!data?.topGainers || data.topGainers.length === 0) && (
                  <Typography variant="body2" color="text.disabled">
                    暂无数据
                  </Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* 卡片 4 — 领跌行业 Top 3 */}
      <Grid size={{ xs: 6, md: 3 }}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            {loading ? (
              <Skeleton variant="rectangular" height={100} />
            ) : (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  领跌行业 Top 3
                </Typography>
                {(data?.topLosers ?? []).slice(0, 3).map((item) => (
                  <Box
                    key={item.name}
                    sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4 }}
                  >
                    <Typography variant="body2">{item.name}</Typography>
                    <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                      {item.pctChange.toFixed(2)}%
                    </Typography>
                  </Box>
                ))}
                {(!data?.topLosers || data.topLosers.length === 0) && (
                  <Typography variant="body2" color="text.disabled">
                    暂无数据
                  </Typography>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </>
  );
}
