import type { CalendarEvent } from 'src/api/alert';

import { varAlpha } from 'minimal-shared/utils';
import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableSortLabel from '@mui/material/TableSortLabel';
import TableContainer from '@mui/material/TableContainer';

import { Iconify } from 'src/components/iconify';

import { getEventImpactLevel } from './types';
import { getEventTypeConfig } from './event-type-config';

// ----------------------------------------------------------------------

const IMPACT_COLOR: Record<'HIGH' | 'MEDIUM' | 'LOW', 'error' | 'warning' | 'info'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
};

type SortKey = 'date' | 'tsCode' | 'impact';

type Props = {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onBatchSubscribe: (events: CalendarEvent[]) => void;
};

function getCalendarRowKey(event: CalendarEvent): string {
  return event.id ?? `${event.tsCode}-${event.date}-${event.type}-${event.title}`;
}

type CalendarRow = { event: CalendarEvent; key: string };

export function createCalendarRows(events: CalendarEvent[]): CalendarRow[] {
  const occurrences = new Map<string, number>();
  return events.map((event) => {
    const baseKey = getCalendarRowKey(event);
    const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
    occurrences.set(baseKey, occurrence);
    return { event, key: occurrence === 1 ? baseKey : `${baseKey}#${occurrence}` };
  });
}

export function reconcileCalendarSelection(
  selected: ReadonlySet<string>,
  events: CalendarEvent[]
): Set<string> {
  const availableKeys = new Set(createCalendarRows(events).map((row) => row.key));
  return new Set([...selected].filter((key) => availableKeys.has(key)));
}

export function CalendarTableView({ events, onSelectEvent, onBatchSubscribe }: Props) {
  const theme = useTheme();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => createCalendarRows(events), [events]);

  const sorted = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.event.date.localeCompare(b.event.date);
      else if (sortKey === 'tsCode') cmp = a.event.tsCode.localeCompare(b.event.tsCode);
      else if (sortKey === 'impact') {
        cmp = (a.event.impactScore ?? 0) - (b.event.impactScore ?? 0);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [rows, sortKey, sortOrder]);

  useEffect(() => {
    setSelected((previous) => {
      const next = reconcileCalendarSelection(previous, events);
      if (next.size === previous.size) return previous;
      return next;
    });
  }, [events]);

  const selectedEvents = sorted.filter((row) => selected.has(row.key)).map((row) => row.event);

  const toggleAll = () => {
    if (selectedEvents.length === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((row) => row.key)));
    }
  };

  const toggleRow = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>, row: CalendarRow) => {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' '))
      return;
    event.preventDefault();
    onSelectEvent(row.event);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  if (events.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">所选区间无事件</Typography>
      </Card>
    );
  }

  return (
    <Card>
      {selectedEvents.length > 0 && (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{
            px: 2,
            py: 1,
            bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            已选 {selectedEvents.length} 项
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            size="small"
            variant="contained"
            startIcon={<Iconify icon="solar:bell-bold" width={16} />}
            onClick={() => onBatchSubscribe(selectedEvents)}
          >
            批量订阅
          </Button>
          <Button size="small" color="inherit" onClick={() => setSelected(new Set())}>
            取消
          </Button>
        </Stack>
      )}

      <TableContainer sx={{ maxHeight: 640 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  size="small"
                  indeterminate={selectedEvents.length > 0 && selectedEvents.length < sorted.length}
                  checked={selectedEvents.length > 0 && selectedEvents.length === sorted.length}
                  onChange={toggleAll}
                  slotProps={{ input: { 'aria-label': '选择全部事件' } }}
                />
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortKey === 'date'}
                  direction={sortOrder}
                  onClick={() => handleSort('date')}
                >
                  日期
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortKey === 'tsCode'}
                  direction={sortOrder}
                  onClick={() => handleSort('tsCode')}
                >
                  股票
                </TableSortLabel>
              </TableCell>
              <TableCell>类型</TableCell>
              <TableCell>标题</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={sortKey === 'impact'}
                  direction={sortOrder}
                  onClick={() => handleSort('impact')}
                >
                  影响力
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.map((row) => {
              const { event, key } = row;
              const cfg = getEventTypeConfig(event.type);
              const impact = getEventImpactLevel(event);
              const impactColor = IMPACT_COLOR[impact];
              const isSelected = selected.has(key);
              return (
                <TableRow
                  key={key}
                  hover
                  selected={isSelected}
                  role="button"
                  onClick={() => onSelectEvent(event)}
                  onKeyDown={(keyboardEvent) => handleRowKeyDown(keyboardEvent, row)}
                  tabIndex={0}
                  aria-label={`查看事件 ${event.stockName || event.tsCode} ${event.title}`}
                  sx={{
                    cursor: 'pointer',
                    // A 14-day deep link can return up to 1,000 events. Keep
                    // off-screen table rows out of the paint work until they
                    // enter the scrollport.
                    contentVisibility: 'auto',
                    containIntrinsicSize: '40px',
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                      outlineOffset: -2,
                    },
                  }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="small"
                      checked={isSelected}
                      onChange={() => toggleRow(key)}
                      slotProps={{
                        input: {
                          'aria-label': `选择事件 ${event.stockName || event.tsCode} ${event.title}`,
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {event.date.slice(0, 4)}-{event.date.slice(4, 6)}-{event.date.slice(6)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2">{event.stockName || event.tsCode}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.tsCode}
                      </Typography>
                      {event.isInWatchlist && (
                        <Iconify icon="solar:star-bold" width={12} sx={{ color: 'warning.main' }} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" color={cfg.color} label={cfg.label} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {event.title}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {event.impactScore != null ? (
                      <Chip size="small" color={impactColor} label={event.impactScore} />
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
