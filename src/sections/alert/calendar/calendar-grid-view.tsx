import type { CalendarEvent } from 'src/api/alert';
import type { Theme, SxProps } from '@mui/material/styles';

import dayjs from 'dayjs';
import { varAlpha } from 'minimal-shared/utils';
import { memo, useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { getEventImpactLevel } from './types';
import { getEventTypeConfig } from './event-type-config';

// ----------------------------------------------------------------------

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

type Props = {
  events: CalendarEvent[];
  startDate: string;
  onSelectDay: (date: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

export function CalendarGridView({ events, startDate, onSelectDay, onSelectEvent }: Props) {
  const theme = useTheme();

  const [cursorMonth, setCursorMonth] = useState(() =>
    startDate ? dayjs(startDate, 'YYYYMMDD').startOf('month') : dayjs().startOf('month')
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [events]);

  // 月历网格：起始周一（0=周日 → 偏移 6；其他 → day-1）
  const cells = useMemo(() => {
    const monthStart = cursorMonth.startOf('month');
    const monthEnd = cursorMonth.endOf('month');
    const startOffset = monthStart.day() === 0 ? 6 : monthStart.day() - 1;
    const endOffset = monthEnd.day() === 0 ? 0 : 7 - monthEnd.day();
    const gridStart = monthStart.subtract(startOffset, 'day');
    const totalDays = monthEnd.diff(monthStart, 'day') + 1 + startOffset + endOffset;
    return Array.from({ length: totalDays }, (_, i) => gridStart.add(i, 'day'));
  }, [cursorMonth]);

  const todayStr = dayjs().format('YYYYMMDD');

  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <IconButton size="small" onClick={() => setCursorMonth((m) => m.subtract(1, 'month'))}>
          <Iconify icon="solar:arrow-left-bold" width={18} />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 96 }}>
          {cursorMonth.format('YYYY年 M月')}
        </Typography>
        <IconButton size="small" onClick={() => setCursorMonth((m) => m.add(1, 'month'))}>
          <Iconify icon="solar:arrow-right-bold" width={18} />
        </IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          点击日期查看当日事件
        </Typography>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
          mb: 0.5,
        }}
      >
        {WEEKDAY_LABELS.map((label, i) => (
          <Typography
            key={label}
            variant="caption"
            sx={{
              textAlign: 'center',
              fontWeight: 600,
              color: i >= 5 ? 'text.disabled' : 'text.secondary',
              py: 0.5,
            }}
          >
            周{label}
          </Typography>
        ))}
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.5,
        }}
      >
        {cells.map((day) => {
          const dateStr = day.format('YYYYMMDD');
          const inMonth = day.isSame(cursorMonth, 'month');
          const isWeekend = day.day() === 0 || day.day() === 6;
          const isToday = dateStr === todayStr;
          const dayEvents = eventsByDate.get(dateStr) ?? [];
          return (
            <MemoizedDayCell
              key={dateStr}
              theme={theme}
              date={day}
              inMonth={inMonth}
              isWeekend={isWeekend}
              isToday={isToday}
              events={dayEvents}
              dateStr={dateStr}
              onSelectDay={onSelectDay}
              onSelectEvent={onSelectEvent}
            />
          );
        })}
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

type DayCellProps = {
  theme: Theme;
  date: dayjs.Dayjs;
  inMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  dateStr: string;
  onSelectDay: (date: string) => void;
  onSelectEvent: (event: CalendarEvent) => void;
};

function DayCell({
  theme,
  date,
  inMonth,
  isWeekend,
  isToday,
  events,
  dateStr,
  onSelectDay,
  onSelectEvent,
}: DayCellProps) {
  const handleSelect = useCallback(() => onSelectDay(dateStr), [onSelectDay, dateStr]);
  const totalCount = events.length;
  const highCount = events.filter((e) => getEventImpactLevel(e) === 'HIGH').length;

  const sxCell: SxProps<Theme> = {
    minHeight: 100,
    p: 0.75,
    borderRadius: 1.25,
    border: '1px solid',
    borderColor: isToday ? 'primary.main' : 'divider',
    bgcolor: isWeekend
      ? varAlpha(theme.vars.palette.text.disabledChannel, 0.04)
      : 'background.paper',
    opacity: inMonth ? 1 : 0.45,
    cursor: 'pointer',
    transition: theme.transitions.create(['background-color', 'border-color']),
    '&:hover': {
      bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.06),
      borderColor: 'primary.light',
    },
  };

  const visibleTypes = Array.from(new Set(events.map((e) => e.type))).slice(0, 4);
  const moreCount = events.length - 3;

  return (
    <Box sx={sxCell} onClick={handleSelect}>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: isToday ? 700 : 500,
            color: isToday ? 'primary.main' : 'text.primary',
          }}
        >
          {date.date()}
        </Typography>
        {totalCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {totalCount}
          </Typography>
        )}
      </Stack>

      {totalCount > 0 && (
        <Stack direction="row" spacing={0.25} sx={{ mb: 0.5 }}>
          {visibleTypes.map((t) => {
            const cfg = getEventTypeConfig(t);
            return (
              <Box
                key={t}
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: `${cfg.paletteKey}.main`,
                }}
              />
            );
          })}
          {highCount > 0 && (
            <Tooltip title={`高影响力 ${highCount} 项`} placement="top">
              <Iconify icon="solar:fire-bold" width={10} sx={{ color: 'error.main', ml: 0.25 }} />
            </Tooltip>
          )}
        </Stack>
      )}

      <Stack spacing={0.25}>
        {events.slice(0, 3).map((event, idx) => {
          const cfg = getEventTypeConfig(event.type);
          return (
            <Box
              key={`${event.tsCode}-${event.type}-${idx}`}
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectEvent(event);
              }}
              sx={{
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                bgcolor: varAlpha(theme.vars.palette[cfg.paletteKey].mainChannel, 0.1),
                color: `${cfg.paletteKey}.darker`,
                fontSize: 12,
                lineHeight: 1.3,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: varAlpha(theme.vars.palette[cfg.paletteKey].mainChannel, 0.2),
                },
              }}
            >
              {event.stockName}·{cfg.label}
            </Box>
          );
        })}
        {moreCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
            +{moreCount} 更多
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

const MemoizedDayCell = memo(DayCell);
