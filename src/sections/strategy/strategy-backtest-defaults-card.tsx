import type { Strategy } from 'src/api/strategy';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import CardContent from '@mui/material/CardContent';

import { fNumber } from 'src/utils/format-number';

import { updateStrategy } from 'src/api/strategy';

import { Iconify } from 'src/components/iconify';

import {
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  REBALANCE_FREQUENCY_OPTIONS,
} from '../backtest/constants';

// ----------------------------------------------------------------------

interface StrategyBacktestDefaultsCardProps {
  strategy: Strategy;
  onUpdate: (updated: Strategy) => void;
}

type DefaultsForm = {
  startDate: string;
  endDate: string;
  initialCapital: number;
  benchmarkTsCode: string;
  universe: string;
  rebalanceFrequency: string;
};

const FALLBACK_DEFAULTS: DefaultsForm = {
  startDate: '2020-01-01',
  endDate: '2024-12-31',
  initialCapital: 1000000,
  benchmarkTsCode: '000300.SH',
  universe: 'HS300',
  rebalanceFrequency: 'MONTHLY',
};

function extractDefaults(strategy: Strategy): DefaultsForm {
  const d = strategy.backtestDefaults ?? {};
  return {
    startDate: (d.startDate as string) ?? FALLBACK_DEFAULTS.startDate,
    endDate: (d.endDate as string) ?? FALLBACK_DEFAULTS.endDate,
    initialCapital:
      typeof d.initialCapital === 'number' ? d.initialCapital : FALLBACK_DEFAULTS.initialCapital,
    benchmarkTsCode: (d.benchmarkTsCode as string) ?? FALLBACK_DEFAULTS.benchmarkTsCode,
    universe: (d.universe as string) ?? FALLBACK_DEFAULTS.universe,
    rebalanceFrequency: (d.rebalanceFrequency as string) ?? FALLBACK_DEFAULTS.rebalanceFrequency,
  };
}

// ----------------------------------------------------------------------

export function StrategyBacktestDefaultsCard({
  strategy,
  onUpdate,
}: StrategyBacktestDefaultsCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<DefaultsForm>(() => extractDefaults(strategy));

  const handleEdit = () => {
    setForm(extractDefaults(strategy));
    setError('');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
  };

  const set = (patch: Partial<DefaultsForm>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
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
    setSaving(true);
    try {
      const updated = await updateStrategy({
        id: strategy.id,
        backtestDefaults: form as unknown as Record<string, unknown>,
      });
      onUpdate(updated);
      setEditing(false);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const current = extractDefaults(strategy);
  const benchmarkLabel =
    BENCHMARK_OPTIONS.find((o) => o.value === current.benchmarkTsCode)?.label ??
    current.benchmarkTsCode;
  const universeLabel =
    UNIVERSE_OPTIONS.find((o) => o.value === current.universe)?.label ?? current.universe;
  const rebalanceLabel =
    REBALANCE_FREQUENCY_OPTIONS.find((o) => o.value === current.rebalanceFrequency)?.label ??
    current.rebalanceFrequency;

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="fontWeightBold">
            回测默认参数
          </Typography>
          {!editing && (
            <Button size="small" startIcon={<Iconify icon="solar:pen-bold" />} onClick={handleEdit}>
              编辑
            </Button>
          )}
        </Box>

        {editing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="开始日期"
                type="date"
                value={form.startDate}
                onChange={(e) => set({ startDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                label="结束日期"
                type="date"
                value={form.endDate}
                onChange={(e) => set({ endDate: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            <TextField
              fullWidth
              label="初始资金（元）"
              type="number"
              value={form.initialCapital}
              onChange={(e) => set({ initialCapital: Number(e.target.value) })}
              slotProps={{ input: { inputProps: { min: 1 } } }}
            />

            <FormControl fullWidth>
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

            <FormControl fullWidth>
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

            <FormControl fullWidth>
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

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={handleCancel} disabled={saving}>
                取消
              </Button>
              <Button variant="contained" onClick={handleSave} loading={saving}>
                保存
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <DefaultRow label="回测区间" value={`${current.startDate} ~ ${current.endDate}`} />
            <DefaultRow label="初始资金" value={`¥ ${fNumber(current.initialCapital)}`} />
            <DefaultRow label="基准指数" value={benchmarkLabel} />
            <DefaultRow label="股票池" value={universeLabel} />
            <DefaultRow label="调仓频率" value={rebalanceLabel} />
            {!strategy.backtestDefaults && (
              <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5 }}>
                * 使用系统默认值，可点击编辑保存自定义默认值
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------

function DefaultRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 72, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
