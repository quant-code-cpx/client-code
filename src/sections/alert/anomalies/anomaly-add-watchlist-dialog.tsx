import type { Watchlist } from 'src/api/watchlist';

import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import CircularProgress from '@mui/material/CircularProgress';

import { getWatchlists, batchAddStocks } from 'src/api/watchlist';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  tsCodes: string[];
  onClose: () => void;
  onSuccess?: (added: number, skipped: number) => void;
};

export function AnomalyAddWatchlistDialog({ open, tsCodes, onClose, onSuccess }: Props) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoading(true);
    getWatchlists()
      .then((res) => {
        setWatchlists(res);
        const def = res.find((w) => w.isDefault) ?? res[0];
        if (def) setSelectedId(def.id);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : '加载自选股分组失败');
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleSubmit = async () => {
    if (typeof selectedId !== 'number' || tsCodes.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await batchAddStocks({
        watchlistId: selectedId,
        stocks: tsCodes.map((code) => ({ tsCode: code })),
      });
      onSuccess?.(result.added, result.skipped);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入自选股失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>加入自选股</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            将选中的 {tsCodes.length} 只异动股票加入自选股分组（已存在的会自动跳过）。
          </Typography>
          {loading ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                加载分组...
              </Typography>
            </Stack>
          ) : (
            <FormControl size="small" fullWidth>
              <InputLabel>目标分组</InputLabel>
              <Select
                label="目标分组"
                value={selectedId}
                onChange={(e) => setSelectedId(Number(e.target.value))}
              >
                {watchlists.map((w) => (
                  <MenuItem key={w.id} value={w.id}>
                    {w.name}
                    {w.isDefault ? '（默认）' : ''} · {w._count?.stocks ?? 0} 只
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          loading={submitting}
          disabled={loading || typeof selectedId !== 'number'}
        >
          确认加入
        </Button>
      </DialogActions>
    </Dialog>
  );
}
