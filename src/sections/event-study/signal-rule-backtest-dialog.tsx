import type { Dayjs } from 'dayjs';
import type { SignalRuleBacktestResult } from 'src/api/event-study';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { backtestSignalRule } from 'src/api/event-study';

import { DatePicker } from 'src/components/date-picker';

import { DataState } from './_shared/data-state';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  ruleId: number;
  ruleName: string;
};

const MAX_RANGE_DAYS = 1095; // 3 年

export function SignalRuleBacktestDialog({ open, onClose, ruleId, ruleName }: Props) {
  const today = dayjs();
  const [startDate, setStartDate] = useState<Dayjs | null>(today.subtract(1, 'year'));
  const [endDate, setEndDate] = useState<Dayjs | null>(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignalRuleBacktestResult | null>(null);
  const [error, setError] = useState('');

  const validateRange = () => {
    if (!startDate || !endDate) return '请选择开始与结束日期';
    if (endDate.isBefore(startDate)) return '结束日期必须晚于开始日期';
    if (endDate.diff(startDate, 'day') > MAX_RANGE_DAYS) return '回测时间窗口不得超过 3 年';
    return '';
  };

  const handleRun = async () => {
    const v = validateRange();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await backtestSignalRule(ruleId, {
        startDate: startDate!.format('YYYYMMDD'),
        endDate: endDate!.format('YYYYMMDD'),
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '回测失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>信号回测 — {ruleName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Alert severity="info" variant="outlined">
            最长回测窗口为 3 年（1095 天），结果包含命中信号 → 持有 N 日的胜率与平均收益。
          </Alert>
          <Stack direction="row" spacing={2}>
            <DatePicker
              label="开始日期 *"
              value={startDate}
              onChange={(v) => setStartDate(v)}
              maxDate={endDate ?? undefined}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label="结束日期 *"
              value={endDate}
              onChange={(v) => setEndDate(v)}
              minDate={startDate ?? undefined}
              maxDate={today}
              slotProps={{ textField: { fullWidth: true } }}
            />
            <Button variant="contained" onClick={handleRun} disabled={loading}>
              开始回测
            </Button>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <DataState loading={loading} skeletonHeight={220}>
            {result ? (
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  {[
                    { label: '触发次数', value: String(result.totalHits), color: 'info.main' },
                    {
                      label: '胜率',
                      value: `${(result.winRate * 100).toFixed(1)}%`,
                      color: 'primary.main',
                    },
                    {
                      label: '平均涨幅',
                      value: `${(result.avgWin * 100).toFixed(2)}%`,
                      color: 'success.main',
                    },
                    {
                      label: '平均跌幅',
                      value: `${(result.avgLoss * 100).toFixed(2)}%`,
                      color: 'error.main',
                    },
                  ].map((c) => (
                    <Grid key={c.label} size={{ xs: 6, md: 3 }}>
                      <Card variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {c.label}
                        </Typography>
                        <Typography
                          variant="h5"
                          sx={{
                            color: c.color,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {c.value}
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    CAR 统计：均值 {(result.carStats.mean * 100).toFixed(2)}% · 中位数{' '}
                    {(result.carStats.median * 100).toFixed(2)}% · 标准差{' '}
                    {(result.carStats.std * 100).toFixed(2)}% · 95 分位{' '}
                    {(result.carStats.p95 * 100).toFixed(2)}% · 盈亏比{' '}
                    {result.profitFactor.toFixed(2)}
                  </Typography>
                </Box>
              </Stack>
            ) : null}
          </DataState>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
}
