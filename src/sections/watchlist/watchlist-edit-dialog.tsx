import type { Watchlist } from 'src/api/watchlist';

import { useState, useEffect } from 'react';

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

import { updateWatchlist } from 'src/api/watchlist';

// ----------------------------------------------------------------------

type WatchlistEditDialogProps = {
  open: boolean;
  watchlist: Watchlist | null;
  onClose: () => void;
  onSuccess: (updated: Watchlist) => void;
};

export function WatchlistEditDialog({
  open,
  watchlist,
  onClose,
  onSuccess,
}: WatchlistEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (watchlist) {
      setName(watchlist.name);
      setDescription(watchlist.description ?? '');
      setIsDefault(watchlist.isDefault);
      setError('');
    }
  }, [watchlist]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!watchlist) return;
    if (!name.trim()) {
      setError('请输入自选组名称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await updateWatchlist({
        id: watchlist.id,
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault,
      });
      handleClose();
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>编辑自选组</DialogTitle>

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
          {loading ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
