import type { CalendarEvent } from 'src/api/alert';

import { useMemo, useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

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

export function CalendarTableView({ events, onSelectEvent, onBatchSubscribe }: Props) {
  const theme = useTheme();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rowKey = (e: CalendarEvent) => e.id ?? `${e.tsCode}-${e.date}-${e.type}-${e.title}`;

  const sorted = useMemo(() => {
    const list = [...events];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortKey === 'tsCode') cmp = a.tsCode.localeCompare(b.tsCode);
      else if (sortKey === 'impact') cmp = (a.impactScore ?? 0) - (b.impactScore ?? 0);
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [events, sortKey, sortOrder]);

  const toggleAll = () => {
    if (selected.size === sorted.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map(rowKey)));
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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const selectedEvents = sorted.filter((e) => selected.has(rowKey(e)));

  if (events.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">所选区间无事件</Typography>
      </Card>
    );
  }

  return (
    <Card>
      {selected.size > 0 && (
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
            已选 {selected.size} 项
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
                  indeterminate={selected.size > 0 && selected.size < sorted.length}
                  checked={selected.size > 0 && selected.size === sorted.length}
                  onChange={toggleAll}
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
            {sorted.map((event) => {
              const key = rowKey(event);
              const cfg = getEventTypeConfig(event.type);
              const impact = getEventImpactLevel(event);
              const impactColor = IMPACT_COLOR[impact];
              const isSelected = selected.has(key);
              return (
                <TableRow
                  key={key}
                  hover
                  selected={isSelected}
                  onClick={() => onSelectEvent(event)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox size="small" checked={isSelected} onChange={() => toggleRow(key)} />
                  </TableCell>
                  <TableCell>
                    {event.date.slice(0, 4)}-{event.date.slice(4, 6)}-{event.date.slice(6)}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography variant="body2">{event.stockName}</Typography>
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
