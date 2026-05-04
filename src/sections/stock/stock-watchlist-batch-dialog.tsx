import type { Watchlist } from 'src/api/watchlist';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
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

import { getWatchlists, batchAddStocks } from 'src/api/watchlist';

// ----------------------------------------------------------------------

type StockWatchlistBatchDialogProps = {
  open: boolean;
  tsCodes: string[];
  onClose: () => void;
  /** 成功后回调，参数为成功加入与跳过数量 */
  onSuccess: (added: number, skipped: number) => void;
};

export function StockWatchlistBatchDialog({
  open,
  tsCodes,
  onClose,
  onSuccess,
}: StockWatchlistBatchDialogProps) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setResult(null);

    getWatchlists()
      .then((items) => {
        if (cancelled) return;
        setWatchlists(items);
        const def = items.find((it) => it.isDefault) ?? items[0];
        if (def !== undefined) setSelectedId(def.id);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '获取自选股列表失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async () => {
    if (selectedId === '' || tsCodes.length === 0) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await batchAddStocks({
        watchlistId: selectedId,
        stocks: tsCodes.map((code) => ({ tsCode: code })),
      });
      setResult(res);
      onSuccess(res.added, res.skipped);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量加入失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>批量加入自选股</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            将 {tsCodes.length} 只股票加入到所选自选股分组。重复标的将被跳过。
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          {result && (
            <Alert severity="success">
              成功加入 {result.added} 只，跳过 {result.skipped} 只重复标的
            </Alert>
          )}

          <FormControl size="small" fullWidth disabled={loading || submitting}>
            <InputLabel>目标自选股</InputLabel>
            <Select
              label="目标自选股"
              value={selectedId === '' ? '' : selectedId}
              onChange={(e) => setSelectedId(Number(e.target.value))}
            >
              {watchlists.map((wl) => (
                <MenuItem key={wl.id} value={wl.id}>
                  {wl.name}
                  {wl.isDefault === true ? '（默认）' : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {result ? '关闭' : '取消'}
        </Button>
        {!result && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || submitting || selectedId === '' || tsCodes.length === 0}
          >
            {submitting ? '提交中…' : '确认加入'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
