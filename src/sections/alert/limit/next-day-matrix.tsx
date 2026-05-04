import type { Theme } from '@mui/material/styles';
import type { LimitNextDayBucket, LimitNextDayResponse } from 'src/api/alert';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { fPercent } from 'src/utils/format-number';

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

export function AlertLimitNextDayMatrix({ data, loading, error }: Props) {
  const theme = useTheme();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            次日表现矩阵
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            加载中…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.rows.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            次日表现矩阵
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
            {error ? error : '即将上线 — 等待后端端点 /api/alert/limit-next-day-perf'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">次日表现矩阵</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            行 = 昨日板高度 · 列 = 今日表现
          </Typography>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${BUCKETS.length}, 1fr) 120px`,
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
      </CardContent>
    </Card>
  );
}
