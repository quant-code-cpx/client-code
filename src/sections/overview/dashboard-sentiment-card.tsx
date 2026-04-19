import type { SentimentResult } from 'src/api/market';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fetchSentiment } from 'src/api/market';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function DashboardSentimentCard() {
  const [data, setData] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchSentiment()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载市场情绪失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const riseCount = data != null ? (data.bigRise ?? 0) + (data.rise ?? 0) : 0;
  const fallCount = data != null ? (data.bigFall ?? 0) + (data.fall ?? 0) : 0;
  const flatCount = data?.flat ?? 0;
  const total = riseCount + fallCount + flatCount;
  const risePercent = total > 0 ? Math.round((riseCount / total) * 100) : 0;
  const flatPercent = total > 0 ? Math.round((flatCount / total) * 100) : 0;
  const fallPercent = total > 0 ? 100 - risePercent - flatPercent : 0;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          市场情绪
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack spacing={2}>
            <Skeleton variant="text" width="50%" height={48} />
            <Skeleton variant="text" width="50%" height={48} />
            <Skeleton variant="rectangular" height={20} />
            <Skeleton variant="text" width="60%" />
          </Stack>
        ) : (
          <>
            {/* 上涨/下跌/平盘 三大数字 */}
            <Stack direction="row" spacing={2} sx={{ mb: 2.5 }}>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  fontWeight="fontWeightBold"
                  sx={{ color: 'error.main', lineHeight: 1 }}
                >
                  {riseCount}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  上涨
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  fontWeight="fontWeightBold"
                  sx={{ color: 'text.disabled', lineHeight: 1 }}
                >
                  {flatCount}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  平盘
                </Typography>
              </Box>
              <Box sx={{ flex: 1, textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  fontWeight="fontWeightBold"
                  sx={{ color: 'success.main', lineHeight: 1 }}
                >
                  {fallCount}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  下跌
                </Typography>
              </Box>
            </Stack>

            {/* 涨/平/跌三段比例条 */}
            <Box sx={{ mb: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  height: 10,
                  borderRadius: 5,
                  overflow: 'hidden',
                  bgcolor: 'divider',
                }}
              >
                <Box
                  sx={{ width: `${risePercent}%`, bgcolor: 'error.main', transition: 'width 0.4s' }}
                />
                <Box
                  sx={{
                    width: `${flatPercent}%`,
                    bgcolor: 'text.disabled',
                    transition: 'width 0.4s',
                  }}
                />
                <Box
                  sx={{
                    width: `${fallPercent}%`,
                    bgcolor: 'success.main',
                    transition: 'width 0.4s',
                  }}
                />
              </Box>
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'error.main' }}>
                  {risePercent}% 上涨
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  {flatPercent}% 平盘
                </Typography>
                <Typography variant="caption" sx={{ color: 'success.main' }}>
                  {fallPercent}% 下跌
                </Typography>
              </Stack>
            </Box>

            {/* 涨停/跌停 */}
            {data != null && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Label color="error" variant="soft">
                  涨停&nbsp;{data.bigRise ?? 0}&nbsp;家
                </Label>
                <Label color="success" variant="soft">
                  跌停&nbsp;{data.bigFall ?? 0}&nbsp;家
                </Label>
                <Label color="default" variant="soft">
                  共&nbsp;{data.total ?? 0}&nbsp;家
                </Label>
              </Stack>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
