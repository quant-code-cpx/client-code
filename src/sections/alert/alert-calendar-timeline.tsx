import type { EventType, CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

type EventTypeConfig = {
  label: string;
  color: 'info' | 'warning' | 'success' | 'error';
};

const EVENT_TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  DISCLOSURE: { label: '财报披露', color: 'info' },
  FLOAT: { label: '限售解禁', color: 'warning' },
  DIVIDEND: { label: '除权除息', color: 'success' },
  FORECAST: { label: '业绩预告', color: 'error' },
};

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];

function formatGroupDate(yyyymmdd: string): string {
  const d = dayjs(yyyymmdd, 'YYYYMMDD');
  return `${d.format('MM/DD')}（周${WEEKDAY_ZH[d.day()]}）`;
}

type Props = {
  events: CalendarEvent[];
  loading: boolean;
};

export function AlertCalendarTimeline({ events, loading }: Props) {
  if (loading) {
    return (
      <Stack spacing={2}>
        {[0, 1, 2].map((i) => (
          <Card key={i} sx={{ p: 2 }}>
            <Skeleton width="30%" height={20} sx={{ mb: 1.5 }} />
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} width="100%" height={36} sx={{ mb: 0.5 }} />
            ))}
          </Card>
        ))}
      </Stack>
    );
  }

  if (events.length === 0) {
    return (
      <Box
        sx={{
          py: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: 'text.secondary',
        }}
      >
        <Typography variant="body1">所选日期范围内没有事件</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          尝试扩大日期范围或取消类型筛选
        </Typography>
      </Box>
    );
  }

  // 按日期分组
  const groups = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    const key = event.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  });

  const sortedDates = Array.from(groups.keys()).sort();

  return (
    <Stack spacing={2}>
      {sortedDates.map((date) => {
        const dayEvents = groups.get(date)!;
        return (
          <Card key={date} sx={{ p: 2 }}>
            <Typography
              variant="subtitle1"
              sx={{ mb: 1.5, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}
            >
              {formatGroupDate(date)}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {dayEvents.length} 条
              </Typography>
            </Typography>

            <Stack spacing={1}>
              {dayEvents.map((event, idx) => {
                const config = EVENT_TYPE_CONFIG[event.type];
                return (
                  <Stack
                    key={idx}
                    direction="row"
                    alignItems="flex-start"
                    spacing={1.5}
                    sx={{
                      py: 0.75,
                      px: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: `${config.color}.main`,
                        flexShrink: 0,
                        mt: 0.75,
                      }}
                    />
                    <Label color={config.color} variant="soft" sx={{ flexShrink: 0 }}>
                      {config.label}
                    </Label>
                    <Box
                      component={RouterLink}
                      href={`/stock/detail?code=${event.tsCode}`}
                      sx={{
                        color: 'primary.main',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        flexShrink: 0,
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      {event.tsCode}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {event.stockName}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {event.title}
                    </Typography>
                    {event.detail && (
                      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200 }}>
                        {typeof event.detail === 'string'
                          ? event.detail
                          : JSON.stringify(event.detail)}
                      </Typography>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
