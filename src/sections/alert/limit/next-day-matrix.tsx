import type { Theme } from '@mui/material/styles';
import type { LimitNextDayBucket, LimitNextDayResponse } from 'src/api/alert';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fNumber, fPercent } from 'src/utils/format-number';

// ----------------------------------------------------------------------

type Props = {
  data: LimitNextDayResponse | null;
  loading?: boolean;
  error?: string;
};

const BUCKETS: Array<{
  key: LimitNextDayBucket;
  label: string;
  tone: 'error' | 'warning' | 'success' | 'default' | 'info';
}> = [
  { key: 'LIMIT_UP', label: '涨停', tone: 'error' },
  { key: 'ABOVE_5', label: '+5% 以上', tone: 'error' },
  { key: 'IN_5', label: '0~5%', tone: 'warning' },
  { key: 'BELOW_0', label: '-0~5%', tone: 'info' },
  { key: 'BELOW_5', label: '-5% 以上', tone: 'success' },
  { key: 'LIMIT_DOWN', label: '跌停', tone: 'success' },
];

function avgColor(theme: Theme, avg: number | null) {
  if (avg == null) return 'transparent';
  if (avg >= 3) return varAlpha(theme.vars.palette.error.mainChannel, 0.2);
  if (avg >= 0) return varAlpha(theme.vars.palette.warning.mainChannel, 0.16);
  if (avg >= -3) return varAlpha(theme.vars.palette.success.mainChannel, 0.16);
  return varAlpha(theme.vars.palette.success.mainChannel, 0.28);
}

function formatCompactDate(value: string | null | undefined) {
  if (!value) return '—';
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
  return value;
}

function getEmptyMessage(data: LimitNextDayResponse | null) {
  if (!data) return '暂无次日表现数据';
  if (data.total > 0 && !data.nextTradeDate) return '暂无下一交易日行情，待日线数据同步后显示';
  return '暂无可统计样本';
}

export function AlertLimitNextDayMatrix({ data, loading, error }: Props) {
  const theme = useTheme();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            次日表现矩阵
          </Typography>
          <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || !data.rows || data.rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            次日表现矩阵
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
            {error ? error : getEmptyMessage(data)}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack
          spacing={1}
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'baseline' }}
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">次日表现矩阵</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              基准日 {formatCompactDate(data.baseDate)} · 次日{' '}
              {formatCompactDate(data.nextTradeDate)}
            </Typography>
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            行 = 昨日板高度 · 列 = 今日表现
          </Typography>
        </Stack>

        <Stack direction="row" spacing={3} flexWrap="wrap" rowGap={1} sx={{ mb: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              样本数
            </Typography>
            <Typography variant="subtitle2" sx={{ fontFeatureSettings: '"tnum"' }}>
              {fNumber(data.total)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              次日均涨幅
            </Typography>
            <Typography variant="subtitle2" sx={{ fontFeatureSettings: '"tnum"' }}>
              {data.avgPctChg != null ? fPercent(data.avgPctChg) : '—'}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              次日上涨占比
            </Typography>
            <Typography variant="subtitle2" sx={{ fontFeatureSettings: '"tnum"' }}>
              {data.upRatio != null ? fPercent(data.upRatio * 100) : '—'}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ overflowX: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              minWidth: 860,
              gridTemplateColumns: `120px repeat(${BUCKETS.length}, 1fr) 96px 120px`,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {/* 表头 */}
            <Box sx={{ p: 1, bgcolor: 'background.neutral' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                昨日板高
              </Typography>
            </Box>
            {BUCKETS.map((b) => (
              <Box
                key={b.key}
                sx={{
                  p: 1,
                  bgcolor: 'background.neutral',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: `${b.tone}.main` }}>
                  {b.label}
                </Typography>
              </Box>
            ))}
            <Box sx={{ p: 1, bgcolor: 'background.neutral', textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                样本
              </Typography>
            </Box>
            <Box sx={{ p: 1, bgcolor: 'background.neutral', textAlign: 'right' }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                次日均涨幅
              </Typography>
            </Box>

            {/* 数据行 */}
            {data.rows.map((row) => (
              <Box key={row.prevStreak} sx={{ display: 'contents' }}>
                <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2">
                    {row.prevStreak === 1 ? '首板' : `${row.prevStreak} 板`}
                  </Typography>
                </Box>
                {BUCKETS.map((b) => (
                  <Box
                    key={b.key}
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      fontFeatureSettings: '"tnum"',
                    }}
                  >
                    <Typography variant="body2">{row.today[b.key] ?? 0}</Typography>
                  </Box>
                ))}
                <Box
                  sx={{
                    p: 1,
                    textAlign: 'right',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  <Typography variant="body2">{fNumber(row.total)}</Typography>
                </Box>
                <Box
                  sx={{
                    p: 1,
                    textAlign: 'right',
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    bgcolor: avgColor(theme, row.avgNextDayPct),
                    fontFeatureSettings: '"tnum"',
                  }}
                >
                  <Typography variant="body2">
                    {row.avgNextDayPct != null ? fPercent(row.avgNextDayPct) : '—'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
