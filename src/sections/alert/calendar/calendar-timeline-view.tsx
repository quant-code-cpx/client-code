import type { CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';
import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

import { getEventImpactLevel } from './types';
import { getEventTypeConfig } from './event-type-config';

// ----------------------------------------------------------------------

const IMPACT_COLOR: Record<'HIGH' | 'MEDIUM' | 'LOW', 'error' | 'warning' | 'info'> = {
  HIGH: 'error',
  MEDIUM: 'warning',
  LOW: 'info',
};

type Props = {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
};

export function CalendarTimelineView({ events, onSelectEvent }: Props) {
  const theme = useTheme();

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    [...events]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((event) => {
        const list = map.get(event.date) ?? [];
        list.push(event);
        map.set(event.date, list);
      });
    return Array.from(map.entries());
  }, [events]);

  if (grouped.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">所选区间无事件</Typography>
      </Card>
    );
  }

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        {grouped.map(([date, items]) => {
          const dayObj = dayjs(date, 'YYYYMMDD');
          const isToday = date === dayjs().format('YYYYMMDD');
          return (
            <Box key={date}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  bgcolor: 'background.paper',
                  py: 0.5,
                  mb: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {dayObj.format('YYYY-MM-DD')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  周{['日', '一', '二', '三', '四', '五', '六'][dayObj.day()]}
                </Typography>
                {isToday && <Chip size="small" color="primary" label="今日" />}
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {items.length} 项
                </Typography>
              </Stack>

              <Stack spacing={1}>
                {items.map((event, idx) => {
                  const cfg = getEventTypeConfig(event.type);
                  const impact = getEventImpactLevel(event);
                  const impactColor = IMPACT_COLOR[impact];
                  return (
                    <ButtonBase
                      key={`${event.tsCode}-${event.type}-${idx}`}
                      aria-label={`查看 ${event.stockName || event.tsCode} ${event.title}`}
                      onClick={() => onSelectEvent(event)}
                      sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'stretch',
                        // The calendar API intentionally supports up to 1,000
                        // events per deep link; defer off-screen card paint.
                        contentVisibility: 'auto',
                        containIntrinsicSize: '72px',
                        textAlign: 'left',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        bgcolor: 'background.neutral',
                        transition: theme.transitions.create('background-color'),
                        '&:hover': {
                          bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.06),
                        },
                        '&.Mui-focusVisible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 4,
                          bgcolor: `${impactColor}.main`,
                          flexShrink: 0,
                        }}
                      />
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ p: 1.25, flexGrow: 1 }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: varAlpha(theme.vars.palette[cfg.paletteKey].mainChannel, 0.12),
                            color: `${cfg.paletteKey}.main`,
                            flexShrink: 0,
                          }}
                        >
                          <Iconify icon={cfg.icon} width={18} />
                        </Box>
                        <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {event.stockName || event.tsCode}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.tsCode}
                            </Typography>
                            {event.isInWatchlist && (
                              <Tooltip title="自选股">
                                <Iconify
                                  icon="solar:star-bold"
                                  width={14}
                                  sx={{ color: 'warning.main' }}
                                />
                              </Tooltip>
                            )}
                          </Stack>
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
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          sx={{ flexShrink: 0 }}
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            color={cfg.color}
                            label={cfg.label}
                          />
                          {event.impactScore != null && (
                            <Chip
                              size="small"
                              color={impactColor}
                              label={`影响 ${event.impactScore}`}
                            />
                          )}
                        </Stack>
                      </Stack>
                    </ButtonBase>
                  );
                })}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}
