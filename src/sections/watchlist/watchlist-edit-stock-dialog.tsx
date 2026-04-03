import type { WatchlistStock } from 'src/api/watchlist';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { updateStock } from 'src/api/watchlist';

// ----------------------------------------------------------------------

type WatchlistEditStockDialogProps = {
  open: boolean;
  stock: WatchlistStock | null;
  watchlistId: number;
  onClose: () => void;
  onSuccess: (updated: WatchlistStock) => void;
};

export function WatchlistEditStockDialog({
  open,
  stock,
  watchlistId,
  onClose,
  onSuccess,
}: WatchlistEditStockDialogProps) {
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stock) {
      setNotes(stock.notes ?? '');
      setTagsInput((stock.tags ?? []).join(', '));
      setTargetPrice(stock.targetPrice != null ? String(stock.targetPrice) : '');
      setError('');
    }
  }, [stock]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!stock) return;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const parsedPrice = targetPrice ? parseFloat(targetPrice) : undefined;

    setLoading(true);
    setError('');
    try {
      const result = await updateStock({
        watchlistId,
        stockId: stock.id,
        notes: notes.trim() || undefined,
        tags,
        targetPrice: parsedPrice != null && !Number.isNaN(parsedPrice) ? parsedPrice : undefined,
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
    <Dialog open={open} onClose={handleClose} fullWidth={true} maxWidth="sm">
      <DialogTitle>编辑 {stock?.tsCode}</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="备注"
            multiline={true}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
          />

          <TextField
            label="标签（逗号分隔）"
            placeholder="例：白酒,消费,龙头"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={loading}
          />

          <TextField
            label="目标价"
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            disabled={loading}
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
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
