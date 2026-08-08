import type { StrategyItem, ScreenerPreset, ScreenerStrategy } from 'src/api/screener';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type ScreenerStrategyBarProps = {
  presets: ScreenerPreset[];
  strategies: ScreenerStrategy[];
  activeId: string | null;
  onSelect: (item: StrategyItem) => void;
  onCustom: () => void;
  onSave: () => void;
  onDelete: (strategy: ScreenerStrategy) => void;
  onUpdate: (id: number) => void;
};

// ----------------------------------------------------------------------

export function ScreenerStrategyBar({
  presets,
  strategies,
  activeId,
  onSelect,
  onCustom,
  onSave,
  onDelete,
  onUpdate,
}: ScreenerStrategyBarProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuStrategy, setMenuStrategy] = useState<ScreenerStrategy | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, strategy: ScreenerStrategy) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuStrategy(strategy);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuStrategy(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', width: 72, flexShrink: 0, pt: 0.75 }}>
          系统预设
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ minWidth: 0 }}>
          {presets.map((preset) => (
            <Tooltip key={preset.id} title={preset.description} arrow describeChild>
              <Chip
                label={preset.name}
                size="small"
                color={activeId === preset.id ? 'primary' : 'default'}
                variant={activeId === preset.id ? 'filled' : 'outlined'}
                onClick={() => onSelect({ ...preset, type: 'builtin' })}
                sx={{ cursor: 'pointer' }}
              />
            </Tooltip>
          ))}
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', width: 72, flexShrink: 0, pt: 0.75 }}>
          我的策略
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center" sx={{ minWidth: 0 }}>
          {strategies.map((strategy) => (
            <Stack key={strategy.id} direction="row" alignItems="center" spacing={0.25}>
              <Tooltip title={strategy.description ?? ''} arrow describeChild>
                <Chip
                  label={strategy.name}
                  size="small"
                  color={activeId === String(strategy.id) ? 'secondary' : 'default'}
                  variant={activeId === String(strategy.id) ? 'filled' : 'outlined'}
                  onClick={() => onSelect(strategy)}
                  sx={{ cursor: 'pointer' }}
                />
              </Tooltip>
              <IconButton
                size="small"
                aria-label={`管理策略 ${strategy.name}`}
                onClick={(event) => handleOpenMenu(event, strategy)}
              >
                <Iconify icon="eva:more-vertical-fill" width={16} />
              </IconButton>
            </Stack>
          ))}
          <Button
            size="small"
            variant="outlined"
            startIcon={<Iconify icon="eva:plus-fill" width={16} />}
            onClick={onSave}
          >
            保存策略
          </Button>
          <Chip
            label="自定义"
            size="small"
            color={activeId === 'custom' ? 'primary' : 'default'}
            variant={activeId === 'custom' ? 'filled' : 'outlined'}
            onClick={onCustom}
            sx={{ cursor: 'pointer' }}
          />
        </Stack>
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        {menuStrategy ? (
          <Typography variant="caption" sx={{ px: 2, py: 0.5, color: 'text.secondary', display: 'block' }}>
            {menuStrategy.name}
          </Typography>
        ) : null}
        <MenuItem
          onClick={() => {
            if (menuStrategy) onUpdate(menuStrategy.id);
            handleMenuClose();
          }}
        >
          <Iconify icon="solar:pen-bold" width={16} sx={{ mr: 1 }} />
          覆盖更新
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuStrategy) onDelete(menuStrategy);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" width={16} sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>
    </Box>
  );
}
