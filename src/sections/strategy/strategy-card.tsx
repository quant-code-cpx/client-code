import type { Strategy } from 'src/api/strategy';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { STRATEGY_TYPE_COLOR, STRATEGY_TYPE_LABEL } from './constants';

// ----------------------------------------------------------------------

interface StrategyCardProps {
  strategy: Strategy;
  onView: (id: string) => void;
  onRun: (strategy: Strategy) => void;
  onEdit: (strategy: Strategy) => void;
  onClone: (strategy: Strategy) => void;
  onDelete: (strategy: Strategy) => void;
  menuAnchorEl: HTMLElement | null;
  menuStrategyId: string | null;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, id: string) => void;
  onMenuClose: () => void;
}

export function StrategyCard({
  strategy,
  onView,
  onRun,
  onEdit,
  onClone,
  onDelete,
  menuAnchorEl,
  menuStrategyId,
  onMenuOpen,
  onMenuClose,
}: StrategyCardProps) {
  const isMenuOpen = menuStrategyId === strategy.id && Boolean(menuAnchorEl);
  const typeColor = STRATEGY_TYPE_COLOR[strategy.strategyType] ?? 'default';
  const typeLabel = STRATEGY_TYPE_LABEL[strategy.strategyType] ?? strategy.strategyType;

  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header row: type label + version + public badge */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Label color={typeColor} variant="soft">
            {typeLabel}
          </Label>
          <Typography variant="caption" color="text.disabled">
            v{strategy.version}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {strategy.isPublic ? (
            <Iconify icon="solar:earth-bold" width={16} sx={{ color: 'info.main' }} />
          ) : (
            <Iconify icon="solar:lock-bold" width={16} sx={{ color: 'text.disabled' }} />
          )}
        </Box>

        {/* Strategy name */}
        <Typography
          variant="subtitle1"
          sx={{
            mb: 0.5,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            cursor: 'pointer',
            '&:hover': { color: 'primary.main' },
          }}
          onClick={() => onView(strategy.id)}
        >
          {strategy.name}
        </Typography>

        {/* Description */}
        {strategy.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {strategy.description}
          </Typography>
        )}

        {/* Tags */}
        {strategy.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {strategy.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}

        {/* Updated time */}
        <Typography variant="caption" color="text.disabled">
          更新于 {fToNow(strategy.updatedAt)}
        </Typography>
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 1.5, py: 1, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Button size="small" onClick={() => onView(strategy.id)}>
            查看
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={() => onRun(strategy)}
            startIcon={<Iconify icon="solar:play-bold" width={14} />}
          >
            回测
          </Button>
        </Box>

        <IconButton size="small" onClick={(e) => onMenuOpen(e, strategy.id)} aria-label="更多操作">
          <Iconify icon="eva:more-vertical-fill" width={18} />
        </IconButton>
      </CardActions>

      {/* More actions menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={isMenuOpen}
        onClose={onMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            onMenuClose();
            onEdit(strategy);
          }}
        >
          <Iconify icon="solar:pen-bold" width={16} sx={{ mr: 1.5 }} />
          编辑
        </MenuItem>
        <MenuItem
          onClick={() => {
            onMenuClose();
            onClone(strategy);
          }}
        >
          <Iconify icon="solar:copy-bold" width={16} sx={{ mr: 1.5 }} />
          克隆
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            onMenuClose();
            onDelete(strategy);
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" width={16} sx={{ mr: 1.5 }} />
          删除
        </MenuItem>
      </Menu>
    </Card>
  );
}
