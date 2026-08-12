import type { SignalRule, EventCalendarResult } from 'src/api/event-study';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { listSignalRules, getEventCalendar } from 'src/api/event-study';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { DataState } from './_shared/data-state';
import { SIGNAL_TYPE_CONFIG } from './constants';
import { EventCalendarHeatmap } from './event-calendar-heatmap';

// ----------------------------------------------------------------------

export function OverviewTab() {
  const [calLoading, setCalLoading] = useState(true);
  const [calendar, setCalendar] = useState<EventCalendarResult | null>(null);
  const [calError, setCalError] = useState('');

  const [activeRules, setActiveRules] = useState<SignalRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);

  useEffect(() => {
    const today = dayjs();
    const start = today.subtract(60, 'day').format('YYYYMMDD');
    const end = today.format('YYYYMMDD');
    getEventCalendar({ startDate: start, endDate: end })
      .then(setCalendar)
      .catch((e) => setCalError(e instanceof Error ? e.message : '加载日历失败'))
      .finally(() => setCalLoading(false));

    listSignalRules({ page: 1, pageSize: 50 })
      .then((d) => {
        const items = (d.items ?? []).filter((r) => r.status === 'ACTIVE');
        setActiveRules(items);
      })
      .finally(() => setRulesLoading(false));
  }, []);

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <DataState loading={calLoading} error={calError} skeletonHeight={360}>
            {calendar ? <EventCalendarHeatmap data={calendar} /> : null}
          </DataState>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                <Iconify
                  icon="solar:fire-bold"
                  width={18}
                  sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }}
                />
                活跃规则 Top {Math.min(5, activeRules.length)}
              </Typography>
              {rulesLoading ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={56} sx={{ borderRadius: 1 }} />
                  ))}
                </Stack>
              ) : activeRules.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无活跃规则
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {activeRules.slice(0, 5).map((rule) => {
                    const cfg = SIGNAL_TYPE_CONFIG[rule.signalType];
                    return (
                      <Box
                        key={rule.id}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                            {rule.name}
                          </Typography>
                          <Label color={cfg.color as 'success' | 'error' | 'info'}>
                            {cfg.label}
                          </Label>
                        </Stack>
                        <Typography variant="caption" sx={{ mt: 0.5, color: 'text.disabled' }}>
                          规则统计能力尚未开放
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
