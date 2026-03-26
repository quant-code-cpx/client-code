import type { ThemePresetKey } from 'src/theme';
import type { IconButtonProps } from '@mui/material/IconButton';

import { useCallback } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Popover from '@mui/material/Popover';
import MenuList from '@mui/material/MenuList';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuItem, { menuItemClasses } from '@mui/material/MenuItem';

import { useThemePreset } from 'src/theme';

// ----------------------------------------------------------------------

export function ThemePopover({ sx, ...other }: IconButtonProps) {
  const { open, anchorEl, onClose, onOpen } = usePopover();

  const { themePresets, setThemePreset, currentThemePreset } = useThemePreset();

  const handleChangeTheme = useCallback(
    (preset: ThemePresetKey) => {
      setThemePreset(preset);
      onClose();
    },
    [onClose, setThemePreset]
  );

  const renderSwatches = (swatches: string[], isCompact = false) => (
    <Box
      sx={{
        gap: 0.5,
        display: 'grid',
        flexShrink: 0,
        gridTemplateColumns: 'repeat(2, 1fr)',
        ...(isCompact && { width: 18, height: 18 }),
      }}
    >
      {swatches.map((color) => (
        <Box
          key={color}
          sx={{
            width: isCompact ? 8 : 10,
            height: isCompact ? 8 : 10,
            borderRadius: '50%',
            bgcolor: color,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.24)',
          }}
        />
      ))}
    </Box>
  );

  return (
    <>
      <IconButton
        aria-label="主题切换按钮"
        onClick={onOpen}
        sx={[
          (theme) => ({
            width: 40,
            height: 40,
            borderRadius: 1.5,
            border: `1px solid ${theme.vars.palette.divider}`,
            ...(open && { bgcolor: theme.vars.palette.action.selected }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        {renderSwatches(currentThemePreset.swatches, true)}
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              borderRadius: 2,
              boxShadow: (theme) => theme.vars.customShadows.dropdown,
            },
          },
        }}
      >
        <MenuList
          sx={{
            p: 0.75,
            gap: 0.5,
            width: 320,
            display: 'flex',
            flexDirection: 'column',
            [`& .${menuItemClasses.root}`]: {
              p: 1,
              gap: 1.5,
              alignItems: 'flex-start',
              borderRadius: 1.5,
              [`&.${menuItemClasses.selected}`]: {
                bgcolor: 'action.selected',
              },
            },
          }}
        >
          {themePresets.map((preset) => {
            const selected = preset.value === currentThemePreset.value;

            return (
              <MenuItem
                key={preset.value}
                selected={selected}
                onClick={() => handleChangeTheme(preset.value)}
              >
                {renderSwatches(preset.swatches)}

                <Stack spacing={0.25} sx={{ minWidth: 0, flex: '1 1 auto' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                    {preset.label}
                  </Typography>

                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {preset.description}
                  </Typography>
                </Stack>

                <Box
                  sx={(theme) => ({
                    width: 22,
                    height: 22,
                    display: 'flex',
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    typography: 'caption',
                    fontWeight: 'fontWeightBold',
                    color: selected ? theme.vars.palette.primary.contrastText : 'text.disabled',
                    bgcolor: selected ? 'primary.main' : 'transparent',
                    border: `1px solid ${selected ? theme.vars.palette.primary.main : theme.vars.palette.divider}`,
                  })}
                >
                  ✓
                </Box>
              </MenuItem>
            );
          })}
        </MenuList>
      </Popover>
    </>
  );
}
