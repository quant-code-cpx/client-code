import type { IconButtonProps } from '@mui/material/IconButton';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { useColorScheme } from '@mui/material/styles';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function DarkModeButton({ sx, ...other }: IconButtonProps) {
  const { mode, setMode } = useColorScheme();

  const isDark = mode === 'dark';

  const handleToggle = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  return (
    <Tooltip title={isDark ? '切换到亮色模式' : '切换到暗色模式'}>
      <IconButton
        aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        onClick={handleToggle}
        sx={[
          (theme) => ({
            borderRadius: 1.5,
            border: `1px solid ${theme.vars.palette.divider}`,
            ...(isDark && { bgcolor: theme.vars.palette.action.selected }),
          }),
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
        {...other}
      >
        <Iconify width={20} icon={isDark ? 'solar:sun-bold-duotone' : 'solar:moon-bold-duotone'} />
      </IconButton>
    </Tooltip>
  );
}
