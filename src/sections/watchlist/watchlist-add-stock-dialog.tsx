import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { addStock } from 'src/api/watchlist';

// ----------------------------------------------------------------------

type WatchlistAddStockDialogProps = {
  open: boolean;
  watchlistId: number;
  onClose: () => void;
  onSuccess: () => void;
};

export function WatchlistAddStockDialog({
  open,
  watchlistId,
  onClose,
  onSuccess,
}: WatchlistAddStockDialogProps) {
  const [tsCode, setTsCode] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setTsCode('');
    setNotes('');
    setTagsInput('');
    setTargetPrice('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!tsCode.trim()) {
      setError('请输入股票代码');
      return;
    }
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const parsedPrice = targetPrice ? parseFloat(targetPrice) : undefined;

    setLoading(true);
    setError('');
    try {
      await addStock({
        watchlistId,
        tsCode: tsCode.trim().toUpperCase(),
        notes: notes.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        targetPrice: parsedPrice !== undefined && !Number.isNaN(parsedPrice) ? parsedPrice : undefined,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>添加股票</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="股票代码"
            required
            autoFocus
            placeholder="例：600519.SH"
            value={tsCode}
            onChange={(e) => setTsCode(e.target.value)}
            disabled={loading}
          />

          <TextField
            label="备注"
            multiline
            rows={2}
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
          {loading ? '添加中...' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
