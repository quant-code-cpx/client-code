import type { WatchlistOverviewItem } from 'src/api/watchlist';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardActionArea from '@mui/material/CardActionArea';

import { Iconify } from 'src/components/iconify';
import { ColoredNumber } from 'src/components/colored-number';

// ----------------------------------------------------------------------

type WatchlistGroupCardProps = {
  watchlist: WatchlistOverviewItem;
  selected: boolean;
  summaryLoading?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function WatchlistGroupCard({
  watchlist,
  selected,
  summaryLoading = false,
  onSelect,
  onEdit,
  onDelete,
}: WatchlistGroupCardProps) {
  const [hovered, setHovered] = useState(false);
  const { summary } = watchlist;

  const accentColor = selected
    ? 'primary.main'
    : watchlist.isDefault
      ? 'warning.main'
      : 'transparent';

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: 200,
        flexShrink: 0,
        position: 'relative',
        border: '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        boxShadow: 'none',
        transition: (theme) =>
          theme.transitions.create(['border-color', 'box-shadow'], { duration: 200 }),
      }}
    >
      {/* 状态条 */}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: accentColor,
        }}
      />

      <CardActionArea onClick={onSelect} sx={{ p: 2, pb: 1.5, pl: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, lineHeight: 1.3, pr: watchlist.isDefault ? 3 : 0 }}
            noWrap
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

        {summary ? (
          <>
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
            <ColoredNumber
              value={summary.avgPctChg}
              format="percent"
              variant="body2"
              sx={{ mt: 0.5, fontWeight: 600 }}
            />
          </>
        ) : summaryLoading ? (
          <Box sx={{ mt: 1.5 }}>
            <Skeleton width="80%" height={16} />
            <Skeleton width="50%" height={20} sx={{ mt: 0.5 }} />
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 1.5, display: 'block' }}>
            暂无摘要
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
          transition: (theme) => theme.transitions.create('opacity', { duration: 200 }),
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
