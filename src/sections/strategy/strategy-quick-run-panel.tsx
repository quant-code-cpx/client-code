import type { Strategy } from 'src/api/strategy';

import dayjs from 'dayjs';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { useRouter } from 'src/routes/hooks';

import { fNumber } from 'src/utils/format-number';

import { runStrategy } from 'src/api/strategy';

import { Iconify } from 'src/components/iconify';

import {
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  REBALANCE_FREQUENCY_OPTIONS,
} from '../backtest/constants';

// ----------------------------------------------------------------------

interface StrategyQuickRunPanelProps {
  strategy: Strategy;
}

type RunForm = {
  name: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  benchmarkTsCode: string;
  universe: string;
  rebalanceFrequency: string;
};

function extractRunForm(strategy: Strategy): RunForm {
  const d = strategy.backtestDefaults ?? {};
  return {
    name: '',
    startDate: (d.startDate as string) ?? '2020-01-01',
    endDate: (d.endDate as string) ?? '2024-12-31',
    initialCapital: typeof d.initialCapital === 'number' ? d.initialCapital : 1000000,
    benchmarkTsCode: (d.benchmarkTsCode as string) ?? '000300.SH',
    universe: (d.universe as string) ?? 'HS300',
    rebalanceFrequency: (d.rebalanceFrequency as string) ?? 'MONTHLY',
  };
}

// Format 'YYYY-MM-DD' → 'YYYYMMDD' for the API
function toApiDate(date: string): string {
  return date.replace(/-/g, '');
}

// ----------------------------------------------------------------------

export function StrategyQuickRunPanel({ strategy }: StrategyQuickRunPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState<RunForm>(() => extractRunForm(strategy));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<RunForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleRun = async () => {
    if (!form.startDate || !form.endDate) {
      setError('请填写回测区间');
      return;
    }
    if (form.startDate >= form.endDate) {
      setError('开始日期须早于结束日期');
      return;
    }
    if (!form.initialCapital || form.initialCapital <= 0) {
      setError('初始资金须大于 0');
      return;
    }
    setError('');
    setRunning(true);
    try {
      const result = await runStrategy({
        strategyId: strategy.id,
        name: form.name.trim() || undefined,
        startDate: toApiDate(form.startDate),
        endDate: toApiDate(form.endDate),
        initialCapital: form.initialCapital,
        benchmarkTsCode: form.benchmarkTsCode,
        universe: form.universe,
        rebalanceFrequency: form.rebalanceFrequency,
      });
      router.push(`/backtest/runs/${result.runId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试');
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Iconify icon="solar:play-bold" sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="fontWeightBold">
            快速回测
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <TextField
            fullWidth
            size="small"
            label="任务名称（可选）"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            inputProps={{ maxLength: 100 }}
            placeholder={`${strategy.name} 回测`}
          />

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <DatePicker
              label="开始日期"
              value={form.startDate ? dayjs(form.startDate) : null}
              onChange={(v) => set({ startDate: v?.format('YYYY-MM-DD') ?? '' })}
              format="YYYY-MM-DD"
              sx={{ width: '100%' }}
              slotProps={{
                textField: { size: 'small' },
                field: { clearable: true },
              }}
            />
            <DatePicker
              label="结束日期"
              value={form.endDate ? dayjs(form.endDate) : null}
              onChange={(v) => set({ endDate: v?.format('YYYY-MM-DD') ?? '' })}
              format="YYYY-MM-DD"
              sx={{ width: '100%' }}
              slotProps={{
                textField: { size: 'small' },
                field: { clearable: true },
              }}
            />
          </Box>

          <TextField
            fullWidth
            size="small"
            label="初始资金（元）"
            type="number"
            value={form.initialCapital}
            onChange={(e) => set({ initialCapital: Number(e.target.value) })}
            slotProps={{ input: { inputProps: { min: 1 } } }}
            helperText={`¥ ${fNumber(form.initialCapital)}`}
          />

          <FormControl fullWidth size="small">
            <InputLabel>基准指数</InputLabel>
            <Select
              label="基准指数"
              value={form.benchmarkTsCode}
              onChange={(e) => set({ benchmarkTsCode: e.target.value })}
            >
              {BENCHMARK_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>股票池</InputLabel>
            <Select
              label="股票池"
              value={form.universe}
              onChange={(e) => set({ universe: e.target.value })}
            >
              {UNIVERSE_OPTIONS.filter((o) => o.value !== 'CUSTOM').map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>调仓频率</InputLabel>
            <Select
              label="调仓频率"
              value={form.rebalanceFrequency}
              onChange={(e) => set({ rebalanceFrequency: e.target.value })}
            >
              {REBALANCE_FREQUENCY_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Iconify icon="solar:play-bold" />}
            onClick={handleRun}
            loading={running}
          >
            开始回测
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
