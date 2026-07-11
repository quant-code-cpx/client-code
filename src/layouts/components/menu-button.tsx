import type { IconButtonProps } from '@mui/material/IconButton';

import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function MenuButton({ sx, ...other }: IconButtonProps) {
  return (
    <Tooltip title="主菜单">
      <IconButton aria-label="主菜单" sx={sx} {...other}>
        <Iconify icon="custom:menu-duotone" width={24} />
      </IconButton>
    </Tooltip>
  );
}
