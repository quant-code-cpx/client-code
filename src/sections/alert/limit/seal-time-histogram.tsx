import type { LimitListItem } from 'src/api/alert';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

// ----------------------------------------------------------------------

type Props = {
  items: LimitListItem[];
};

type Bucket = { label: string; up: number; broken: number };

function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = /^(\d{2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

const WINDOW_MIN = 5;
// 9:30 → 11:30 + 13:00 → 15:00 共 240 分钟
const SESSIONS: Array<[number, number]> = [
  [9 * 60 + 25, 11 * 60 + 30], // 含集合竞价 9:25
  [13 * 60, 15 * 60],
];

function buildBuckets(items: LimitListItem[]): Bucket[] {
  const buckets: Bucket[] = [];
  SESSIONS.forEach(([start, end]) => {
    for (let t = start; t < end; t += WINDOW_MIN) {
      const hh = String(Math.floor(t / 60)).padStart(2, '0');
      const mm = String(t % 60).padStart(2, '0');
      buckets.push({ label: `${hh}:${mm}`, up: 0, broken: 0 });
    }
  });

  items.forEach((it) => {
    const minute = timeToMinutes(it.firstSealTime);
    if (minute == null) return;
    let offset = 0;
    for (const [start, end] of SESSIONS) {
      if (minute >= start && minute < end) {
        offset += Math.floor((minute - start) / WINDOW_MIN);
        const target = buckets[offset];
        if (target) {
          if (it.limitType === 'UP') target.up += 1;
          if (it.limitType === 'BROKEN') target.broken += 1;
        }
        return;
      }
      offset += Math.floor((end - start) / WINDOW_MIN);
    }
  });

  return buckets;
}

export function AlertLimitSealTimeHistogram({ items }: Props) {
  const theme = useTheme();
  const buckets = useMemo(() => buildBuckets(items), [items]);

  const max = buckets.reduce((m, b) => Math.max(m, b.up + b.broken), 1);
  const hasFirstSealTime = items.some((it) => it.firstSealTime);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">封板时间分布</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            按首封时间 5 分钟窗口
          </Typography>
        </Stack>

        {!hasFirstSealTime ? (
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
            等待后端字段：firstSealTime
          </Typography>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <Stack direction="row" alignItems="flex-end" spacing={0.25} sx={{ height: 120, mb: 1 }}>
              {buckets.map((b, idx) => {
                const total = b.up + b.broken;
                const upH = (b.up / max) * 100;
                const brokenH = (b.broken / max) * 100;
                return (
                  <Box
                    key={`${b.label}-${idx}`}
                    sx={{
                      flex: 1,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      minWidth: 2,
                    }}
                    title={`${b.label} | 涨停 ${b.up} · 炸板 ${b.broken}`}
                  >
                    {total === 0 ? null : (
                      <>
                        <Box
                          sx={{
                            height: `${upH}%`,
                            bgcolor: theme.vars.palette.error.main,
                            borderRadius: '2px 2px 0 0',
                          }}
                        />
                        <Box
                          sx={{
                            height: `${brokenH}%`,
                            bgcolor: theme.vars.palette.warning.main,
                          }}
                        />
                      </>
                    )}
                  </Box>
                );
              })}
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                09:25
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                11:30
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                13:00
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                15:00
              </Typography>
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
