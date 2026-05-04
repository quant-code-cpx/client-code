import type { ReactNode } from 'react';
import type { EventType, EventTypeItem } from 'src/api/event-study';

import { useMemo, useState, useContext, createContext } from 'react';

// ----------------------------------------------------------------------

type EventStudyContextValue = {
  eventTypes: EventTypeItem[];
  selectedEventType: EventType | '';
  setSelectedEventType: (v: EventType | '') => void;
  startDate: string | null;
  endDate: string | null;
  setDateRange: (range: { startDate: string | null; endDate: string | null }) => void;
};

const EventStudyContext = createContext<EventStudyContextValue | null>(null);

type ProviderProps = {
  eventTypes: EventTypeItem[];
  children: ReactNode;
};

export function EventStudyProvider({ eventTypes, children }: ProviderProps) {
  const [selectedEventType, setSelectedEventType] = useState<EventType | ''>('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const value = useMemo<EventStudyContextValue>(
    () => ({
      eventTypes,
      selectedEventType,
      setSelectedEventType,
      startDate,
      endDate,
      setDateRange: ({ startDate: s, endDate: e }) => {
        setStartDate(s);
        setEndDate(e);
      },
    }),
    [eventTypes, selectedEventType, startDate, endDate]
  );

  return <EventStudyContext.Provider value={value}>{children}</EventStudyContext.Provider>;
}

export function useEventStudy() {
  const ctx = useContext(EventStudyContext);
  if (!ctx) throw new Error('useEventStudy must be used inside EventStudyProvider');
  return ctx;
}
