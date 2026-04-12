import type { EventType, CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

import { alertApi } from 'src/api/alert';
import { DashboardContent } from 'src/layouts/dashboard';

import { AlertCalendarStats } from '../alert-calendar-stats';
import { AlertCalendarFilters } from '../alert-calendar-filters';
import { AlertCalendarTimeline } from '../alert-calendar-timeline';

// ----------------------------------------------------------------------

export function AlertCalendarView() {
  const defaultStart = dayjs().subtract(30, 'day').format('YYYYMMDD');
  const defaultEnd = dayjs().format('YYYYMMDD');

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [tsCode, setTsCode] = useState<string | undefined>();
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alertApi.getCalendar({
        startDate,
        endDate,
        tsCode,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
      });
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载事件数据失败');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, tsCode, selectedTypes]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <DashboardContent maxWidth="xl">
      <Typography variant="h4" sx={{ mb: 3 }}>
        事件日历
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <AlertCalendarFilters
        startDate={startDate}
        endDate={endDate}
        selectedTypes={selectedTypes}
        tsCode={tsCode}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onTypesChange={setSelectedTypes}
        onTsCodeChange={setTsCode}
      />

      <AlertCalendarStats events={events} loading={loading} />

      <AlertCalendarTimeline events={events} loading={loading} />
    </DashboardContent>
  );
}
