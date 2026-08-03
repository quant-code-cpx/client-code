import type { ScreenerFilters } from 'src/api/screener';
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

function toOptionalNumber(value: string, multiplier = 1): number | undefined {
  return value === '' ? undefined : Number(value) * multiplier;
}

export function SubscriptionEditDialog({
  open,
  subscription,
  onClose,
  onSuccess,
}: SubscriptionEditDialogProps) {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('DAILY');
  const [filters, setFilters] = useState<Partial<ScreenerFilters>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!subscription) return;
    setName(subscription.name);
    setFrequency(subscription.frequency);
    setFilters({ ...subscription.filters });
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
            可修改常用筛选条件；其他历史条件会保留。完整规则工作台将在新契约上线后提供。
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle2">常用筛选条件</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              <TextField
                label="PE 最小值"
                type="number"
                value={filters.minPeTtm ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minPeTtm: toOptionalNumber(e.target.value),
                  }))
                }
                disabled={loading}
                size="small"
                sx={{ flex: '1 1 160px' }}
              />
              <TextField
                label="PE 最大值"
                type="number"
                value={filters.maxPeTtm ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxPeTtm: toOptionalNumber(e.target.value),
                  }))
                }
                disabled={loading}
                size="small"
                sx={{ flex: '1 1 160px' }}
              />
              <TextField
                label="ROE 最小值 (%)"
                type="number"
                value={filters.minRoe ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minRoe: toOptionalNumber(e.target.value),
                  }))
                }
                disabled={loading}
                size="small"
                sx={{ flex: '1 1 160px' }}
              />
              <TextField
                label="营收增速最小值 (%)"
                type="number"
                value={filters.minRevenueYoy ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minRevenueYoy: toOptionalNumber(e.target.value),
                  }))
                }
                disabled={loading}
                size="small"
                sx={{ flex: '1 1 180px' }}
              />
              <TextField
                label="市值最小值 (亿)"
                type="number"
                value={filters.minTotalMv != null ? filters.minTotalMv / 10000 : ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minTotalMv: toOptionalNumber(e.target.value, 10000),
                  }))
                }
                disabled={loading}
                size="small"
                sx={{ flex: '1 1 160px' }}
              />
              <TextField
                label="市值最大值 (亿)"
                type="number"
                value={filters.maxTotalMv != null ? filters.maxTotalMv / 10000 : ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxTotalMv: toOptionalNumber(e.target.value, 10000),
                  }))
                }
                disabled={loading}
                size="small"
                sx={{ flex: '1 1 160px' }}
              />
              <TextField
                label="至少命中偏多信号数"
                type="number"
                value={filters.minBuySignalCount ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    minBuySignalCount: toOptionalNumber(e.target.value),
                  }))
                }
                disabled={loading}
                size="small"
                slotProps={{ htmlInput: { min: 1, max: 5, step: 1 } }}
                sx={{ flex: '1 1 180px' }}
              />
            </Box>
          </Box>

          {subscription && (
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
              >
                筛选条件摘要
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
