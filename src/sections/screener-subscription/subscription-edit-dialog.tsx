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

import { SubscriptionFiltersSummary } from './subscription-filters-summary';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subscription) return;
    setName(subscription.name);
    setFrequency(subscription.frequency);
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
      const result = await updateSubscription({
        id: subscription.id,
        name: name.trim(),
        frequency,
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
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}
            >
              执行频率
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={frequency}
              onChange={(_, val) => {
                if (val) setFrequency(val);
              }}
              size="small"
            >
              <ToggleButton value="DAILY">每日</ToggleButton>
              <ToggleButton value="WEEKLY">每周</ToggleButton>
              <ToggleButton value="MONTHLY">每月</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Alert severity="info" variant="outlined">
            目前后端仅支持修改名称与频率。如需调整筛选条件，请删除此订阅后重新创建。
          </Alert>

          {subscription && (
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
              >
                当前筛选条件（只读）
              </Typography>
              <SubscriptionFiltersSummary
                filters={subscription.filters}
                sortBy={subscription.sortBy}
                sortOrder={subscription.sortOrder}
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? '保存中…' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
