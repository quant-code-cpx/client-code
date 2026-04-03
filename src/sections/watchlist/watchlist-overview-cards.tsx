import type { WatchlistOverviewItem } from 'src/api/watchlist';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/components/iconify';

import { WatchlistGroupCard } from './watchlist-group-card';

// ----------------------------------------------------------------------

type WatchlistOverviewCardsProps = {
  watchlists: WatchlistOverviewItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onEdit: (watchlist: WatchlistOverviewItem) => void;
  onDelete: (watchlist: WatchlistOverviewItem) => void;
  onCreate: () => void;
};

export function WatchlistOverviewCards({
  watchlists,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
}: WatchlistOverviewCardsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        overflowX: 'auto',
        pb: 1,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'divider' },
      }}
    >
      {watchlists.map((wl) => (
        <WatchlistGroupCard
          key={wl.id}
          watchlist={wl}
          selected={wl.id === selectedId}
          onSelect={() => onSelect(wl.id)}
          onEdit={() => onEdit(wl)}
          onDelete={() => onDelete(wl)}
        />
      ))}

      <Card
        sx={{
          width: 200,
          flexShrink: 0,
          border: '2px dashed',
          borderColor: 'divider',
          bgcolor: 'transparent',
          boxShadow: 'none',
        }}
      >
        <CardActionArea
          onClick={onCreate}
          sx={{
            height: '100%',
            minHeight: 100,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 2,
          }}
        >
          <Iconify icon="solar:add-circle-bold" width={28} sx={{ color: 'text.disabled' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            新建自选组
          </Typography>
        </CardActionArea>
      </Card>
    </Box>
  );
}
