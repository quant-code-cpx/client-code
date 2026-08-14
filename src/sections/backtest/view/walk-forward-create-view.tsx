import type { StrategyTypeValue } from 'src/api/backtest';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { createWalkForwardRun, createRollingBacktest } from 'src/api/backtest';

import { Iconify } from 'src/components/iconify';

import { WalkForwardRunSettings } from '../walk-forward-run-settings';
import { WalkForwardCreateModeTabs } from '../walk-forward-create-mode-tabs';
import { BacktestStrategyConfigPanel } from '../backtest-strategy-config-panel';
import { WalkForwardParamSpaceEditor } from '../walk-forward-param-space-editor';
import {
  toApiDate,
  DEFAULT_WF_FORM,
  DEFAULT_MA_CONFIG,
  STRATEGY_TYPE_OPTIONS,
  DEFAULT_FACTOR_CONFIG,
  DEFAULT_SCREENING_CONFIG,
  DEFAULT_CUSTOM_POOL_CONFIG,
} from '../constants';

import type { ParamDefinition } from '../walk-forward-param-space-editor';
import type { BacktestRunForm, CreateWalkForwardFormState } from '../types';
import type { WalkForwardCreateMode } from '../walk-forward-create-mode-tabs';

// ----------------------------------------------------------------------

const DEFAULT_STRATEGY_CONFIGS: Record<string, Record<string, unknown>> = {
  MA_CROSS_SINGLE: DEFAULT_MA_CONFIG as unknown as Record<string, unknown>,
  SCREENING_ROTATION: DEFAULT_SCREENING_CONFIG as unknown as Record<string, unknown>,
  FACTOR_RANKING: DEFAULT_FACTOR_CONFIG as unknown as Record<string, unknown>,
  CUSTOM_POOL_REBALANCE: DEFAULT_CUSTOM_POOL_CONFIG as unknown as Record<string, unknown>,
};

const STRATEGY_PARAMS: Record<string, ParamDefinition[]> = {
  MA_CROSS_SINGLE: [
    { key: 'shortWindow', label: '短期均线周期', defaultMin: 3, defaultMax: 20, defaultStep: 1 },
    { key: 'longWindow', label: '长期均线周期', defaultMin: 10, defaultMax: 60, defaultStep: 5 },
  ],
  SCREENING_ROTATION: [
    { key: 'topN', label: '持仓数量 (topN)', defaultMin: 5, defaultMax: 50, defaultStep: 5 },
  ],
  FACTOR_RANKING: [
    { key: 'topN', label: '持仓数量 (topN)', defaultMin: 5, defaultMax: 50, defaultStep: 5 },
  ],
  CUSTOM_POOL_REBALANCE: [],
};

// ----------------------------------------------------------------------

export function WalkForwardCreateView() {
  const router = useRouter();

  const [form, setForm] = useState<CreateWalkForwardFormState>({
    ...DEFAULT_WF_FORM,
    baseStrategyConfig: DEFAULT_STRATEGY_CONFIGS[DEFAULT_WF_FORM.baseStrategyType] ?? {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleStrategyTypeChange = useCallback((strategyType: string) => {
    setForm((prev) => ({
      ...prev,
      baseStrategyType: strategyType,
      baseStrategyConfig: DEFAULT_STRATEGY_CONFIGS[strategyType] ?? {},
      paramSearchSpace: {},
    }));
  }, []);

  const handleModeChange = useCallback((mode: WalkForwardCreateMode) => {
    setForm((prev) => ({
      ...prev,
      mode: mode === 'ROLLING' ? 'ROLLING' : 'WF',
      windowMode: mode === 'WF_ANCHORED' ? 'ANCHORED' : 'ROLLING',
    }));
  }, []);

  // Adapter for BacktestStrategyConfigPanel
  const fakeForm: BacktestRunForm = {
    name: '',
    startDate: '',
    endDate: '',
    initialCapital: form.initialCapital,
    benchmarkTsCode: form.benchmarkTsCode,
    universe: form.universe,
    customUniverseTsCodes: [],
    rebalanceFrequency: form.rebalanceFrequency,
    priceMode: 'NEXT_OPEN',
    enableTradeConstraints: false,
    enableT1Restriction: true,
    partialFillEnabled: true,
    commissionRate: 0.0003,
    stampDutyRate: 0.0005,
    minCommission: 5,
    slippageBps: 5,
    maxPositions: 20,
    maxWeightPerStock: 0.1,
    minDaysListed: 60,
    strategyConfig: form.baseStrategyConfig,
  };

  const handleStrategyConfigChange = useCallback((updates: Partial<BacktestRunForm>) => {
    const strategyConfig = updates.strategyConfig;
    if (strategyConfig !== undefined) {
      setForm((prev) => ({ ...prev, baseStrategyConfig: strategyConfig }));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError('');
    try {
      const strategyType = form.baseStrategyType as StrategyTypeValue;

      if (form.mode === 'ROLLING') {
        const res = await createRollingBacktest({
          name: form.name || undefined,
          strategyType,
          strategyConfig: form.baseStrategyConfig,
          rollingParamSpace: form.paramSearchSpace,
          startDate: toApiDate(form.fullStartDate),
          endDate: toApiDate(form.fullEndDate),
          lookbackDays: form.inSampleDays,
          holdingPeriodDays: form.outOfSampleDays,
          optimizeMetric: form.optimizeMetric,
          benchmarkTsCode: form.benchmarkTsCode,
          universe: form.universe,
          initialCapital: form.initialCapital,
          rebalanceFrequency: form.rebalanceFrequency,
        });
        router.push(`/backtest/walk-forward/${res.wfRunId}`);
        return;
      }

      const res = await createWalkForwardRun({
        name: form.name || undefined,
        mode: 'WF',
        windowMode: form.windowMode,
        baseStrategyType: strategyType,
        baseStrategyConfig: form.baseStrategyConfig,
        paramSearchSpace: form.paramSearchSpace,
        fullStartDate: toApiDate(form.fullStartDate),
        fullEndDate: toApiDate(form.fullEndDate),
        inSampleDays: form.inSampleDays,
        outOfSampleDays: form.outOfSampleDays,
        stepDays: form.stepDays,
        optimizeMetric: form.optimizeMetric,
        benchmarkTsCode: form.benchmarkTsCode,
        universe: form.universe,
        initialCapital: form.initialCapital,
        rebalanceFrequency: form.rebalanceFrequency,
        purgeDays: form.purgeDays,
        embargoDays: form.embargoDays,
        minOosTrades: form.minOosTrades,
      });
      router.push(`/backtest/walk-forward/${res.wfRunId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, router]);

  const availableParams = STRATEGY_PARAMS[form.baseStrategyType] ?? [];
  const selectedMode: WalkForwardCreateMode =
    form.mode === 'ROLLING'
      ? 'ROLLING'
      : form.windowMode === 'ANCHORED'
        ? 'WF_ANCHORED'
        : 'WF_ROLLING';
  return (
    <DashboardContent>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          component={RouterLink}
          href="/backtest/walk-forward"
          startIcon={<Iconify icon="solar:arrow-left-bold" width={18} />}
          variant="text"
          size="small"
        >
          返回列表
        </Button>
        <Typography variant="h4">新建稳健性验证任务</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <WalkForwardCreateModeTabs value={selectedMode} onChange={handleModeChange} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          {/* Base strategy */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                基础策略
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  id="walk-forward-name"
                  name="name"
                  fullWidth
                  size="small"
                  label="任务名称（可选）"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel id="walk-forward-strategy-type-label">策略类型</InputLabel>
                  <Select
                    id="walk-forward-strategy-type"
                    name="baseStrategyType"
                    labelId="walk-forward-strategy-type-label"
                    label="策略类型"
                    value={form.baseStrategyType}
                    onChange={(e) => handleStrategyTypeChange(e.target.value)}
                  >
                    {STRATEGY_TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <BacktestStrategyConfigPanel
                  selectedTemplateId={form.baseStrategyType}
                  form={fakeForm}
                  fieldIdPrefix="walk-forward-strategy"
                  onChange={handleStrategyConfigChange}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Param search space */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <WalkForwardParamSpaceEditor
                availableParams={availableParams}
                value={form.paramSearchSpace}
                onChange={(next) => setForm((prev) => ({ ...prev, paramSearchSpace: next }))}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <WalkForwardRunSettings
            form={form}
            submitting={submitting}
            onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleSubmit}
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
