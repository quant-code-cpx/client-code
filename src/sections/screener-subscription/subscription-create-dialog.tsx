import type { ScreenerStrategy } from 'src/api/screener';
import type { ScreenerSubscription, SubscriptionFrequency } from 'src/api/screener-subscription';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fetchStrategies } from 'src/api/screener';
import { createSubscription } from 'src/api/screener-subscription';

// ----------------------------------------------------------------------

type SubscriptionCreateDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (sub: ScreenerSubscription) => void;
};

export function SubscriptionCreateDialog({
  open,
  onClose,
  onSuccess,
}: SubscriptionCreateDialogProps) {
  const [tab, setTab] = useState<'strategy' | 'custom'>('strategy');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<SubscriptionFrequency>('DAILY');
  const [strategyId, setStrategyId] = useState<number | ''>('');
  const [strategies, setStrategies] = useState<ScreenerStrategy[]>([]);
  const [strategiesLoading, setStrategiesLoading] = useState(false);

  // Custom filter fields
  const [minPeTtm, setMinPeTtm] = useState('');
  const [maxPeTtm, setMaxPeTtm] = useState('');
  const [minRoe, setMinRoe] = useState('');
  const [minRevenueYoy, setMinRevenueYoy] = useState('');
  const [minTotalMv, setMinTotalMv] = useState('');
  const [maxTotalMv, setMaxTotalMv] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStrategiesLoading(true);
    fetchStrategies()
      .then((res) => setStrategies(res.strategies))
      .catch(() => setStrategies([]))
      .finally(() => setStrategiesLoading(false));
  }, [open]);

  const handleClose = () => {
    setName('');
    setFrequency('DAILY');
    setStrategyId('');
    setTab('strategy');
    setMinPeTtm('');
    setMaxPeTtm('');
    setMinRoe('');
    setMinRevenueYoy('');
    setMinTotalMv('');
    setMaxTotalMv('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入订阅名称');
      return;
    }
    if (tab === 'strategy' && !strategyId) {
      setError('请选择一个策略');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const filters =
        tab === 'custom'
          ? {
              ...(minPeTtm ? { minPeTtm: Number(minPeTtm) } : {}),
              ...(maxPeTtm ? { maxPeTtm: Number(maxPeTtm) } : {}),
              ...(minRoe ? { minRoe: Number(minRoe) } : {}),
              ...(minRevenueYoy ? { minRevenueYoy: Number(minRevenueYoy) } : {}),
              ...(minTotalMv ? { minTotalMv: Number(minTotalMv) } : {}),
              ...(maxTotalMv ? { maxTotalMv: Number(maxTotalMv) } : {}),
            }
          : undefined;

      const result = await createSubscription({
        name: name.trim(),
        frequency,
        ...(tab === 'strategy' && strategyId ? { strategyId: strategyId as number } : {}),
        ...(tab === 'custom' ? { filters } : {}),
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
      <DialogTitle>新建条件订阅</DialogTitle>

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

          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="从已保存策略" value="strategy" />
            <Tab label="自定义条件" value="custom" />
          </Tabs>

          {tab === 'strategy' && (
            <TextField
              select
              label="选择策略"
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={loading || strategiesLoading}
              helperText={strategiesLoading ? '加载中...' : strategies.length === 0 ? '暂无已保存策略' : ''}
            >
              {strategies.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {tab === 'custom' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
          )}
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
