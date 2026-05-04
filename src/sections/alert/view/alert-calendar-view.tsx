import type { CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { DashboardContent } from 'src/layouts/dashboard';

import {
  ExportDialog,
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
  const { events, totalCount, truncated, dataAsOf, loading, error, refresh } =
    useCalendarEvents(filters);

  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
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
      update({ view: 'timeline', startDate: date, endDate: date });
    },
    [update]
  );

  const handleCardClick = useCallback(
    (key: string) => {
      const today = dayjs().format('YYYYMMDD');
      if (key === 'today') {
        update({ startDate: today, endDate: today, impactLevels: [] });
      } else if (key === 'week') {
        update({ startDate: today, endDate: dayjs().add(6, 'day').format('YYYYMMDD') });
      } else if (key === 'high-impact') {
        update({ impactLevels: ['HIGH'] });
      } else if (key === 'watchlist') {
        update({ scope: 'WATCHLIST' });
      }
    },
    [update]
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
          {truncated && '（已截断 1000 项）'}
          {dataAsOf && ` · 数据更新于 ${dataAsOf}`}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <CalendarFilters
        filters={filters}
        onChange={update}
        onReset={reset}
        onRefresh={refresh}
        onExport={() => setExportOpen(true)}
      />

      <CalendarStatsRow events={events} loading={loading} onCardClick={handleCardClick} />

      {loading && <LinearProgress sx={{ mb: 1.5 }} />}

      {filters.view === 'grid' && (
        <CalendarGridView
          events={events}
          startDate={filters.startDate}
          onSelectDay={handleSelectDay}
          onSelectEvent={handleSelectEvent}
        />
      )}
      {filters.view === 'timeline' && (
        <CalendarTimelineView events={events} onSelectEvent={handleSelectEvent} />
      )}
      {filters.view === 'table' && (
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

      <ExportDialog open={exportOpen} filters={filters} onClose={() => setExportOpen(false)} />

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
