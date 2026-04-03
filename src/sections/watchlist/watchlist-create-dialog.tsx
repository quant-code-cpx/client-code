import type { Watchlist } from 'src/api/watchlist';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { createWatchlist } from 'src/api/watchlist';

// ----------------------------------------------------------------------

type WatchlistCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (watchlist: Watchlist) => void;
};

export function WatchlistCreateDialog({ open, onClose, onSuccess }: WatchlistCreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setName('');
    setDescription('');
    setIsDefault(false);
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入自选组名称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await createWatchlist({
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault,
      });
      handleClose();
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>新建自选组</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="名称"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            helperText={`${name.length}/50`}
            disabled={loading}
          />

          <TextField
            label="描述"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            helperText={`${description.length}/200`}
            disabled={loading}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={loading}
              />
            }
            label="设为默认自选组"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? '创建中...' : '创建'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
