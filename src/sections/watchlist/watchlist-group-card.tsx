import type { WatchlistOverviewItem } from 'src/api/watchlist';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { fPctChg } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type WatchlistGroupCardProps = {
  watchlist: WatchlistOverviewItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function WatchlistGroupCard({
  watchlist,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: WatchlistGroupCardProps) {
  const [hovered, setHovered] = useState(false);
  const { summary } = watchlist;

  const avgPctChg = summary?.avgPctChg ?? 0;
  const pctChgColor =
    avgPctChg > 0 ? 'error.main' : avgPctChg < 0 ? 'success.main' : 'text.secondary';

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: 200,
        flexShrink: 0,
        position: 'relative',
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'transparent',
        transition: 'border-color 0.2s',
      }}
    >
      <CardActionArea onClick={onSelect} sx={{ p: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, lineHeight: 1.3, pr: watchlist.isDefault ? 3 : 0 }}
            noWrap={true}
          >
            {watchlist.name}
          </Typography>
          {watchlist.isDefault && (
            <Iconify
              icon="solar:star-bold"
              width={16}
              sx={{ color: 'warning.main', flexShrink: 0, mt: 0.2 }}
            />
          )}
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {watchlist._count.stocks} 支股票
        </Typography>

        {summary && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {summary.upCount}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {summary.downCount}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {summary.flatCount}
              </Typography>
            </Box>
          </Box>
        )}

        {summary && (
          <Typography variant="body2" sx={{ mt: 0.5, color: pctChgColor, fontWeight: 600 }}>
            {fPctChg(summary.avgPctChg)}
          </Typography>
        )}
      </CardActionArea>

      <Box
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          display: 'flex',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s',
          bgcolor: 'background.paper',
          borderRadius: 1,
        }}
      >
        <Tooltip title="编辑">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Iconify icon="solar:pen-bold" width={14} />
          </IconButton>
        </Tooltip>
        <Tooltip title="删除">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" width={14} />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
}
