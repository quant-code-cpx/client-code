import type { ComparisonConfigResponse } from 'src/api/backtest';

import dayjs from 'dayjs';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { getRunDetail, createComparison } from 'src/api/backtest';

import { Iconify } from 'src/components/iconify';

import { ComparisonStrategyCard } from '../comparison-strategy-card';
import {
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  DEFAULT_FACTOR_CONFIG,
  DEFAULT_SCREENING_CONFIG,
  DEFAULT_COMPARISON_STRATEGY,
} from '../constants';

import type { CreateComparisonFormState, ComparisonStrategyFormItem } from '../types';

// ----------------------------------------------------------------------

const DEFAULT_FORM: CreateComparisonFormState = {
  name: '',
  strategies: [
    {
      ...(DEFAULT_COMPARISON_STRATEGY as ComparisonStrategyFormItem),
      label: '策略1',
      strategyConfig: DEFAULT_SCREENING_CONFIG as unknown as Record<string, unknown>,
    },
    {
      ...(DEFAULT_COMPARISON_STRATEGY as ComparisonStrategyFormItem),
      label: '策略2',
      strategyConfig: DEFAULT_FACTOR_CONFIG as unknown as Record<string, unknown>,
      strategyType: 'FACTOR_RANKING',
    },
  ],
  startDate: '2020-01-01',
  endDate: '2024-12-31',
  benchmarkTsCode: '000300.SH',
  universe: 'HS300',
  initialCapital: 1000000,
};

const COMPARISON_PREFILL_KEY = 'compare:create-prefill:v1';

function normalizeFormDate(value: string | null | undefined) {
  if (!value) return '';
  if (/^\d{8}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  }
  return value.slice(0, 10);
}

function buildFormFromComparisonConfig(
  config: ComparisonConfigResponse
): CreateComparisonFormState {
  const { commonConfig } = config;

  return {
    name: commonConfig.name ? `${commonConfig.name}（复制）` : '复制多策略对比',
    strategies: config.strategies.map((strategy, index) => ({
      label: strategy.label ?? `策略${index + 1}`,
      strategyType: strategy.strategyType ?? strategy.type ?? 'SCREENING_ROTATION',
      strategyConfig: strategy.strategyConfig ?? strategy.config ?? {},
      rebalanceFrequency: strategy.rebalanceFrequency ?? strategy.freq ?? 'MONTHLY',
    })),
    startDate: normalizeFormDate(commonConfig.startDate),
    endDate: normalizeFormDate(commonConfig.endDate),
    benchmarkTsCode: commonConfig.benchmarkTsCode ?? '000300.SH',
    universe: commonConfig.universe ?? 'HS300',
    initialCapital: commonConfig.initialCapital ?? 1000000,
  };
}

// ----------------------------------------------------------------------

export function ComparisonCreateView() {
  const router = useRouter();
  const [form, setForm] = useState<CreateComparisonFormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const state = window.history.state?.usr as
      | { sourceRunIds?: string[]; comparisonConfig?: ComparisonConfigResponse }
      | undefined;

    if (state?.comparisonConfig) {
      setForm(buildFormFromComparisonConfig(state.comparisonConfig));
      return undefined;
    }

    const storedComparisonConfig = window.sessionStorage.getItem(COMPARISON_PREFILL_KEY);
    if (storedComparisonConfig) {
      try {
        setForm(buildFormFromComparisonConfig(JSON.parse(storedComparisonConfig)));
        window.sessionStorage.removeItem(COMPARISON_PREFILL_KEY);
        return undefined;
      } catch {
        window.sessionStorage.removeItem(COMPARISON_PREFILL_KEY);
      }
    }

    const sourceRunIds = state?.sourceRunIds?.filter(Boolean) ?? [];
    if (sourceRunIds.length < 2) return undefined;

    let cancelled = false;
    setPrefillLoading(true);
    setError('');

    Promise.all(sourceRunIds.slice(0, 10).map((runId) => getRunDetail(runId)))
      .then((details) => {
        if (cancelled || details.length < 2) return;
        const first = details[0];
        setForm({
          name: `历史任务对比（${details.length} 条）`,
          strategies: details.map((detail, index) => ({
            label: detail.name ?? `任务 ${index + 1}`,
            strategyType: detail.strategyType,
            strategyConfig: detail.strategyConfig,
            rebalanceFrequency: detail.rebalanceFrequency,
          })),
          startDate: first.startDate,
          endDate: first.endDate,
          benchmarkTsCode: first.benchmarkTsCode,
          universe: first.universe,
          initialCapital: first.initialCapital,
        });
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '历史任务预填失败');
      })
      .finally(() => {
        if (!cancelled) setPrefillLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateStrategy = useCallback(
    (index: number, patch: Partial<ComparisonStrategyFormItem>) => {
      setForm((prev) => {
        const strategies = [...prev.strategies];
        strategies[index] = { ...strategies[index], ...patch };
        return { ...prev, strategies };
      });
    },
    []
  );

  const addStrategy = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      strategies: [
        ...prev.strategies,
        {
          ...(DEFAULT_COMPARISON_STRATEGY as ComparisonStrategyFormItem),
          label: `策略${prev.strategies.length + 1}`,
          strategyConfig: DEFAULT_SCREENING_CONFIG as unknown as Record<string, unknown>,
        },
      ],
    }));
  }, []);

  const removeStrategy = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      strategies: prev.strategies.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError('');
    try {
      const toApiDate = (d: string) => d.replace(/-/g, '');
      const res = await createComparison({
        name: form.name || undefined,
        strategies: form.strategies.map((s) => ({
          label: s.label || undefined,
          strategyType: s.strategyType,
          strategyConfig: s.strategyConfig,
          rebalanceFrequency: s.rebalanceFrequency,
        })),
        startDate: toApiDate(form.startDate),
        endDate: toApiDate(form.endDate),
        benchmarkTsCode: form.benchmarkTsCode,
        universe: form.universe,
        initialCapital: form.initialCapital,
      });
      window.sessionStorage.setItem(`compare:job:${res.groupId}`, res.jobId);
      router.push(`/backtest/comparison/${res.groupId}`, { state: { jobId: res.jobId } });
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, router]);

  let submitButtonLabel = '提交对比任务';
  if (prefillLoading) submitButtonLabel = '正在预填…';
  else if (submitting) submitButtonLabel = '提交中…';

  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          component={RouterLink}
          href="/backtest"
          startIcon={<Iconify icon="solar:arrow-left-bold" width={18} />}
          variant="text"
          size="small"
        >
          返回工作台
        </Button>
        <Typography variant="h4">多策略对比</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Strategy cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            {form.strategies.map((s, i) => (
              <ComparisonStrategyCard
                key={i}
                index={i}
                item={s}
                onChange={(patch) => updateStrategy(i, patch)}
                onRemove={() => removeStrategy(i)}
                canRemove={form.strategies.length > 2}
              />
            ))}
          </Box>

          {form.strategies.length < 10 && (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:add-circle-bold" width={18} />}
              onClick={addStrategy}
              size="small"
            >
              添加策略 ({form.strategies.length}/10)
            </Button>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                通用参数
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="对比名称（可选）"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <DatePicker
                    label="开始日期"
                    value={form.startDate ? dayjs(form.startDate) : null}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, startDate: v?.format('YYYY-MM-DD') ?? '' }))
                    }
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
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, endDate: v?.format('YYYY-MM-DD') ?? '' }))
                    }
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
                  label="初始资金"
                  type="number"
                  value={form.initialCapital}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, initialCapital: Number(e.target.value) }))
                  }
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>基准指数</InputLabel>
                  <Select
                    label="基准指数"
                    value={form.benchmarkTsCode}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, benchmarkTsCode: e.target.value }))
                    }
                  >
                    {BENCHMARK_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" fullWidth>
                  <InputLabel>股票池</InputLabel>
                  <Select
                    label="股票池"
                    value={form.universe}
                    onChange={(e) => setForm((prev) => ({ ...prev, universe: e.target.value }))}
                  >
                    {UNIVERSE_OPTIONS.filter((o) => o.value !== 'CUSTOM').map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ my: 2 }} />

          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={prefillLoading || submitting || form.strategies.length < 2}
            onClick={handleSubmit}
            startIcon={<Iconify icon="solar:play-circle-bold" width={20} />}
          >
            {submitButtonLabel}
          </Button>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
