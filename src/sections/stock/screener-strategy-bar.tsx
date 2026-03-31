import type { StrategyItem, ScreenerPreset, ScreenerStrategy } from 'src/api/screener';

import { useState } from 'react';

import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type ScreenerStrategyBarProps = {
  presets: ScreenerPreset[];
  strategies: ScreenerStrategy[];
  activeId: string | null;
  onSelect: (item: StrategyItem) => void;
  onReset: () => void;
  onSave: () => void;
  onDelete: (id: number) => void;
  onUpdate: (id: number) => void;
};

// ----------------------------------------------------------------------

export function ScreenerStrategyBar({
  presets,
  strategies,
  activeId,
  onSelect,
  onReset,
  onSave,
  onDelete,
  onUpdate,
}: ScreenerStrategyBarProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuStrategy, setMenuStrategy] = useState<ScreenerStrategy | null>(null);

  const handleStrategyContextMenu = (
    e: React.MouseEvent<HTMLElement>,
    strategy: ScreenerStrategy
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuStrategy(strategy);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuStrategy(null);
  };

  return (
    <>
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2, alignItems: 'center' }}
      >
        {/* 系统预设 */}
        {presets.map((preset) => (
          <Tooltip key={preset.id} title={preset.description} arrow>
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

        {/* 用户策略（有则显示分隔线） */}
        {strategies.length > 0 && <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />}
        {strategies.map((strategy) => (
          <Tooltip key={strategy.id} title={strategy.description ?? ''} arrow>
            <Chip
              label={strategy.name}
              size="small"
              color={activeId === String(strategy.id) ? 'secondary' : 'default'}
              variant={activeId === String(strategy.id) ? 'filled' : 'outlined'}
              onClick={() => onSelect(strategy)}
              onContextMenu={(e) => handleStrategyContextMenu(e, strategy)}
              onDelete={(e) =>
                handleStrategyContextMenu(e as unknown as React.MouseEvent<HTMLElement>, strategy)
              }
              deleteIcon={<Iconify icon="eva:more-vertical-fill" width={14} />}
              sx={{ cursor: 'pointer' }}
            />
          </Tooltip>
        ))}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* 操作按钮 */}
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
          onClick={onReset}
          sx={{ cursor: 'pointer' }}
        />
      </Stack>

      {/* 用户策略右键菜单 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {menuStrategy && (
          <Typography
            variant="caption"
            sx={{ px: 2, py: 0.5, color: 'text.secondary', display: 'block' }}
          >
            {menuStrategy.name}
          </Typography>
        )}
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
            if (menuStrategy) onDelete(menuStrategy.id);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="eva:trash-2-outline" width={16} sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>
    </>
  );
}
