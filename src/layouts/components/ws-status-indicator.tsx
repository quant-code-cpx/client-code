import type { SocketStatus } from 'src/lib/socket';
import type { IconifyName } from 'src/components/iconify/register-icons';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { keyframes } from '@mui/material/styles';

import { getSocketStatus, onSocketStatusChange } from 'src/lib/socket';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const STATUS_CONFIG: Record<SocketStatus, { icon: IconifyName; color: string; label: string }> = {
  connected: { icon: 'solar:plug-circle-bold', color: 'success.main', label: '已连接' },
  reconnecting: { icon: 'solar:refresh-circle-bold', color: 'warning.main', label: '重连中…' },
  disconnected: { icon: 'solar:plug-circle-bold', color: 'error.main', label: '已断开' },
};

export function WsStatusIndicator() {
  const [status, setStatus] = useState<SocketStatus>(getSocketStatus);

  useEffect(() => onSocketStatusChange(setStatus), []);

  const cfg = STATUS_CONFIG[status];

  return (
    <Tooltip title={`WebSocket: ${cfg.label}`}>
      <Box
        component="span"
        sx={{
          width: 32,
          height: 32,
          color: cfg.color,
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Iconify
          icon={cfg.icon}
          width={20}
          sx={
            status === 'reconnecting'
              ? {
                  animation: `${spin} 1s linear infinite`,
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                }
              : undefined
          }
        />
      </Box>
    </Tooltip>
  );
}
