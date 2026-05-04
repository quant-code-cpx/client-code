import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { Iconify } from 'src/components/iconify';

import type { LocalPreset } from './use-local-presets';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  presets: LocalPreset[];
  onClose: () => void;
  onSave: (name: string) => void;
  onLoad: (preset: LocalPreset) => void;
  onRemove: (id: string) => void;
};

export function ScreeningPresetDialog({ open, presets, onClose, onSave, onLoad, onRemove }: Props) {
  const [name, setName] = useState('');

  const handleSave = () => {
    onSave(name);
    setName('');
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>本地预设</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="预设名称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：高质量价值组合"
              fullWidth
            />
            <Button variant="contained" onClick={handleSave} disabled={!name.trim()}>
              保存当前条件
            </Button>
          </Stack>

          <Divider />

          {presets.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              还没有预设。本地最多保存 10 条，超出后将自动覆盖最早的一条。
            </Typography>
          ) : (
            <Stack spacing={1}>
              {presets.map((p) => (
                <Stack
                  key={p.id}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ p: 1, borderRadius: 1, bgcolor: 'background.neutral' }}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                      {p.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {p.state.conditions.length} 条条件 · {p.state.tradeDate} ·{' '}
                      {p.state.universe || '全市场'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      onLoad(p);
                      onClose();
                    }}
                  >
                    加载
                  </Button>
                  <IconButton size="small" color="error" onClick={() => onRemove(p.id)}>
                    <Iconify icon="eva:trash-2-outline" width={18} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>关闭</Button>
      </DialogActions>
    </Dialog>
  );
}
