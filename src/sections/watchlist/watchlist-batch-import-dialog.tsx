import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { batchAddStocks } from 'src/api/watchlist';

// ----------------------------------------------------------------------

type WatchlistBatchImportDialogProps = {
  open: boolean;
  watchlistId: number;
  onClose: () => void;
  onSuccess: (result: { added: number; skipped: number }) => void;
};

export function WatchlistBatchImportDialog({
  open,
  watchlistId,
  onClose,
  onSuccess,
}: WatchlistBatchImportDialogProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsedCodes = useMemo(() => {
    const codes = input
      .split(/[,\n]/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
    return [...new Set(codes)];
  }, [input]);

  const handleClose = () => {
    setInput('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (parsedCodes.length === 0) {
      setError('请输入至少一个股票代码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await batchAddStocks({
        watchlistId,
        stocks: parsedCodes.map((tsCode) => ({ tsCode })),
      });
      handleClose();
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量导入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>批量导入股票</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            每行或用逗号分隔输入股票代码，例如：600519.SH, 000858.SZ
          </Typography>

          <TextField
            label="股票代码"
            multiline
            rows={6}
            placeholder={'600519.SH\n000858.SZ\n300750.SZ'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />

          {parsedCodes.length > 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              已识别 {parsedCodes.length} 个股票代码
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || parsedCodes.length === 0}>
          {loading ? '导入中...' : `导入 ${parsedCodes.length} 支`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
