import { useState } from 'react';

import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// 结果卡通用动作组：复制 / 跳转下一步
// ----------------------------------------------------------------------

export type NextAction = {
  key: string;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
};

type Props = {
  onCopy?: () => void;
  nextActions?: NextAction[];
};

export function ResultActions({ onCopy, nextActions }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const hasNext = (nextActions ?? []).length > 0;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      {onCopy && (
        <Tooltip title="复制 JSON">
          <IconButton size="small" onClick={onCopy} aria-label="复制 JSON">
            <Iconify icon="solar:copy-bold" width={18} />
          </IconButton>
        </Tooltip>
      )}
      {hasNext && (
        <>
          <Tooltip title="带到下一步">
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="带到下一步">
              <Iconify icon="solar:arrow-right-bold" width={18} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{ paper: { sx: { minWidth: 220 } } }}
          >
            {(nextActions ?? []).map((a) => (
              <Tooltip
                key={a.key}
                title={a.disabled && a.disabledReason ? a.disabledReason : ''}
                placement="left"
              >
                <span>
                  <MenuItem
                    disabled={a.disabled}
                    onClick={() => {
                      setAnchorEl(null);
                      a.onClick();
                    }}
                  >
                    {a.label}
                  </MenuItem>
                </span>
              </Tooltip>
            ))}
          </Menu>
        </>
      )}
    </Stack>
  );
}
