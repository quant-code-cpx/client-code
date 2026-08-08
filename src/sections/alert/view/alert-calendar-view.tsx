import type { CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';
import { useState, useCallback, useTransition } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { DashboardContent } from 'src/layouts/dashboard';

import {
  CalendarFilters,
  SubscribeDialog,
  CalendarGridView,
  CalendarStatsRow,
  useCalendarState,
  CalendarTableView,
  EventDetailDrawer,
  useCalendarEvents,
  CalendarTimelineView,
} from '../calendar';

// ----------------------------------------------------------------------

export function AlertCalendarView() {
  const { filters, update, reset } = useCalendarState();
  const {
    error,
    events,
    loading,
    refresh,
    hasLoaded,
    totalCount,
    refreshing,
    initialLoading,
  } = useCalendarEvents(filters);
  const [, startTransition] = useTransition();

  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [subscribeEvents, setSubscribeEvents] = useState<CalendarEvent[]>([]);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ msg: string; severity: 'success' | 'info' } | null>(
    null
  );

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setDetailEvent(event);
  }, []);

  const handleCloseDetail = useCallback(() => setDetailEvent(null), []);

  const handleSelectDay = useCallback(
    (date: string) => {
      startTransition(() => {
        update({ view: 'timeline', startDate: date, endDate: date });
      });
    },
    [update, startTransition]
  );

  const handleNavigateMonth = useCallback(
    (startDate: string, endDate: string) => update({ startDate, endDate }),
    [update]
  );

  const handleCardClick = useCallback(
    (key: string) => {
      const today = dayjs().format('YYYYMMDD');
      startTransition(() => {
        if (key === 'today') {
          update({ startDate: today, endDate: today, impactLevels: [] });
        } else if (key === 'week') {
          update({ startDate: today, endDate: dayjs().add(6, 'day').format('YYYYMMDD') });
        } else if (key === 'high-impact') {
          update({ impactLevels: ['HIGH'] });
        } else if (key === 'watchlist') {
          update({ scope: 'WATCHLIST' });
        }
      });
    },
    [update, startTransition]
  );

  const handleSubscribeOne = useCallback((event: CalendarEvent) => {
    setSubscribeEvents([event]);
    setSubscribeOpen(true);
  }, []);

  const handleBatchSubscribe = useCallback((selectedEvents: CalendarEvent[]) => {
    setSubscribeEvents(selectedEvents);
    setSubscribeOpen(true);
  }, []);

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h4">事件日历</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          共 {totalCount} 项事件
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <CalendarFilters filters={filters} onChange={update} onReset={reset} onRefresh={refresh} />

      <CalendarStatsRow
        events={events}
        loading={loading || !hasLoaded}
        onCardClick={handleCardClick}
      />

      {refreshing && <LinearProgress aria-label="正在更新事件" sx={{ mb: 1.5 }} />}

      {initialLoading && <CalendarViewSkeleton />}

      {!initialLoading && hasLoaded && filters.view === 'grid' && (
        <CalendarGridView
          events={events}
          startDate={filters.startDate}
          endDate={filters.endDate}
          onSelectDay={handleSelectDay}
          onSelectEvent={handleSelectEvent}
          onNavigateMonth={handleNavigateMonth}
        />
      )}
      {!initialLoading && hasLoaded && filters.view === 'timeline' && (
        <CalendarTimelineView events={events} onSelectEvent={handleSelectEvent} />
      )}
      {!initialLoading && hasLoaded && filters.view === 'table' && (
        <CalendarTableView
          events={events}
          onSelectEvent={handleSelectEvent}
          onBatchSubscribe={handleBatchSubscribe}
        />
      )}

      <EventDetailDrawer
        open={!!detailEvent}
        event={detailEvent}
        onClose={handleCloseDetail}
        onSubscribe={handleSubscribeOne}
      />

      <SubscribeDialog
        open={subscribeOpen}
        events={subscribeEvents}
        onClose={() => setSubscribeOpen(false)}
        onSuccess={() => setSnackbar({ msg: '订阅成功', severity: 'success' })}
      />

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} variant="filled">
            {snackbar.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </DashboardContent>
  );
}

function CalendarViewSkeleton() {
  return (
    <Stack spacing={1} aria-label="正在加载事件日历">
      <Skeleton variant="rounded" height={48} />
      <Skeleton variant="rounded" height={420} />
    </Stack>
  );
}
