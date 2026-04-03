import type { ScreenerSubscription, SubscriptionFrequency } from 'src/api/screener-subscription';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { updateSubscription } from 'src/api/screener-subscription';

// ----------------------------------------------------------------------

type SubscriptionEditDialogProps = {
  open: boolean;
  subscription: ScreenerSubscription | null;
  onClose: () => void;
  onSuccess: (updated: ScreenerSubscription) => void;
};

export function SubscriptionEditDialog({
  open,
  subscription,
  onClose,
  onSuccess,
}: SubscriptionEditDialogProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('DAILY');
  const [minPeTtm, setMinPeTtm] = useState('');
  const [maxPeTtm, setMaxPeTtm] = useState('');
  const [minRoe, setMinRoe] = useState('');
  const [minRevenueYoy, setMinRevenueYoy] = useState('');
  const [minTotalMv, setMinTotalMv] = useState('');
  const [maxTotalMv, setMaxTotalMv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subscription) return;
    setName(subscription.name);
    setFrequency(subscription.frequency);
    const f = subscription.filters;
    setMinPeTtm(f.minPeTtm != null ? String(f.minPeTtm) : '');
    setMaxPeTtm(f.maxPeTtm != null ? String(f.maxPeTtm) : '');
    setMinRoe(f.minRoe != null ? String(f.minRoe) : '');
    setMinRevenueYoy(f.minRevenueYoy != null ? String(f.minRevenueYoy) : '');
    setMinTotalMv(f.minTotalMv != null ? String(f.minTotalMv) : '');
    setMaxTotalMv(f.maxTotalMv != null ? String(f.maxTotalMv) : '');
  }, [subscription]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!subscription) return;
    if (!name.trim()) {
      setError('请输入订阅名称');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const filters = {
        ...(minPeTtm ? { minPeTtm: Number(minPeTtm) } : {}),
        ...(maxPeTtm ? { maxPeTtm: Number(maxPeTtm) } : {}),
        ...(minRoe ? { minRoe: Number(minRoe) } : {}),
        ...(minRevenueYoy ? { minRevenueYoy: Number(minRevenueYoy) } : {}),
        ...(minTotalMv ? { minTotalMv: Number(minTotalMv) } : {}),
        ...(maxTotalMv ? { maxTotalMv: Number(maxTotalMv) } : {}),
      };
      const result = await updateSubscription({
        id: subscription.id,
        name: name.trim(),
        frequency,
        filters,
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
      <DialogTitle>编辑条件订阅</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="订阅名称"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            helperText={`${name.length}/50`}
            disabled={loading}
          />

          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              执行频率
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={frequency}
              onChange={(_, val) => { if (val) setFrequency(val); }}
              size="small"
            >
              <ToggleButton value="DAILY">每日</ToggleButton>
              <ToggleButton value="WEEKLY">每周</ToggleButton>
              <ToggleButton value="MONTHLY">每月</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="subtitle2">筛选条件</Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="PE 最小值"
              type="number"
              value={minPeTtm}
              onChange={(e) => setMinPeTtm(e.target.value)}
              disabled={loading}
              size="small"
            />
            <TextField
              label="PE 最大值"
              type="number"
              value={maxPeTtm}
              onChange={(e) => setMaxPeTtm(e.target.value)}
              disabled={loading}
              size="small"
            />
          </Box>
          <TextField
            label="ROE 最小值 (%)"
            type="number"
            value={minRoe}
            onChange={(e) => setMinRoe(e.target.value)}
            disabled={loading}
            size="small"
          />
          <TextField
            label="营收增速最小值 (%)"
            type="number"
            value={minRevenueYoy}
            onChange={(e) => setMinRevenueYoy(e.target.value)}
            disabled={loading}
            size="small"
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="市值最小值 (亿)"
              type="number"
              value={minTotalMv}
              onChange={(e) => setMinTotalMv(e.target.value)}
              disabled={loading}
              size="small"
            />
            <TextField
              label="市值最大值 (亿)"
              type="number"
              value={maxTotalMv}
              onChange={(e) => setMaxTotalMv(e.target.value)}
              disabled={loading}
              size="small"
            />
          </Box>
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
