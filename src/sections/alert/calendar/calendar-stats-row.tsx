import type { CalendarEvent } from 'src/api/alert';

import dayjs from 'dayjs';
import { useMemo } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { getEventImpactLevel } from './types';

// ----------------------------------------------------------------------

type CardSpec = {
  key: string;
  label: string;
  value: number;
  caption: string;
  icon: string;
  paletteKey: 'primary' | 'info' | 'warning' | 'success' | 'error';
};

type Props = {
  events: CalendarEvent[];
  loading: boolean;
  onCardClick: (key: string) => void;
};

export function CalendarStatsRow({ events, loading, onCardClick }: Props) {
  const theme = useTheme();

  const cards = useMemo<CardSpec[]>(() => {
    const todayStr = dayjs().format('YYYYMMDD');
    const weekEndStr = dayjs().add(6, 'day').format('YYYYMMDD');

    const todayCount = events.filter((e) => e.date === todayStr).length;
    const weekCount = events.filter((e) => e.date >= todayStr && e.date <= weekEndStr).length;
    const highImpactCount = events.filter((e) => getEventImpactLevel(e) === 'HIGH').length;
    const watchlistCount = events.filter((e) => e.isInWatchlist === true).length;

    return [
      {
        key: 'today',
        label: '今日事件',
        value: todayCount,
        caption: '点击聚焦今日',
        icon: 'solar:calendar-bold',
        paletteKey: 'primary',
      },
      {
        key: 'week',
        label: '未来一周',
        value: weekCount,
        caption: '点击聚焦未来 7 天',
        icon: 'solar:calendar-search-bold',
        paletteKey: 'info',
      },
      {
        key: 'high-impact',
        label: '高影响事件',
        value: highImpactCount,
        caption: '高影响力事件',
        icon: 'solar:fire-bold',
        paletteKey: 'error',
      },
      {
        key: 'watchlist',
        label: '自选股事件',
        value: watchlistCount,
        caption: '涉及自选股',
        icon: 'solar:star-bold',
        paletteKey: 'warning',
      },
    ];
  }, [events]);

  return (
    <Card
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        mb: 2.5,
        overflow: 'hidden',
      }}
    >
      {cards.map((card, index) => {
        const color = theme.palette[card.paletteKey].main;
        const channel = theme.vars.palette[card.paletteKey].mainChannel;
        return (
          <CardActionArea
            key={card.key}
            onClick={() => onCardClick(card.key)}
            sx={{
              p: 1.5,
              minHeight: 82,
              borderRight: {
                xs: index % 2 === 0 ? '1px solid' : 0,
                md: index < cards.length - 1 ? '1px solid' : 0,
              },
              borderBottom: { xs: index < 2 ? '1px solid' : 0, md: 0 },
              borderColor: 'divider',
            }}
          >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: varAlpha(channel, 0.12),
                    color,
                  }}
                >
                  <Iconify icon={card.icon as never} width={24} />
                </Box>
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    {card.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {loading ? '—' : fNumber(card.value)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {card.caption}
                  </Typography>
                </Stack>
              </Stack>
          </CardActionArea>
        );
      })}
    </Card>
  );
}
