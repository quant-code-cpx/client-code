import type { StrategyTypeValue } from 'src/api/backtest';

import dayjs from 'dayjs';
import { useState, useCallback } from 'react';

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

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { DashboardContent } from 'src/layouts/dashboard';
import { createWalkForwardRun, createRollingBacktest } from 'src/api/backtest';

import { Iconify } from 'src/components/iconify';
import { DatePicker } from 'src/components/date-picker';

import { WalkForwardWindowPreview } from '../walk-forward-window-preview';
import { WalkForwardAdvancedFields } from '../walk-forward-advanced-fields';
import { WalkForwardCreateModeTabs } from '../walk-forward-create-mode-tabs';
import { BacktestStrategyConfigPanel } from '../backtest-strategy-config-panel';
import { WalkForwardParamSpaceEditor } from '../walk-forward-param-space-editor';
import {
  toApiDate,
  DEFAULT_WF_FORM,
  UNIVERSE_OPTIONS,
  BENCHMARK_OPTIONS,
  DEFAULT_MA_CONFIG,
  STRATEGY_TYPE_OPTIONS,
  DEFAULT_FACTOR_CONFIG,
  OPTIMIZE_METRIC_OPTIONS,
  DEFAULT_SCREENING_CONFIG,
  DEFAULT_CUSTOM_POOL_CONFIG,
  REBALANCE_FREQUENCY_OPTIONS,
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
  const isRollingMode = form.mode === 'ROLLING';
  const hasSearchSpace = Object.keys(form.paramSearchSpace).length > 0;

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
          {/* Time window settings */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                {isRollingMode ? 'Rolling 窗口设置' : 'WF 窗口设置'}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <DatePicker
                    label="全量开始日期"
                    value={form.fullStartDate ? dayjs(form.fullStartDate) : null}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, fullStartDate: v?.format('YYYY-MM-DD') ?? '' }))
                    }
                    sx={{ width: '100%' }}
                  />
                  <DatePicker
                    label="全量结束日期"
                    value={form.fullEndDate ? dayjs(form.fullEndDate) : null}
                    onChange={(v) =>
                      setForm((prev) => ({ ...prev, fullEndDate: v?.format('YYYY-MM-DD') ?? '' }))
                    }
                    sx={{ width: '100%' }}
                  />
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  label={isRollingMode ? '回看天数' : '样本内天数'}
                  type="number"
                  value={form.inSampleDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, inSampleDays: Number(e.target.value) }))
                  }
                  helperText={isRollingMode ? 'Rolling 优化回看窗口' : '60–2520 交易日'}
                />
                <TextField
                  fullWidth
                  size="small"
                  label={isRollingMode ? '持有期天数' : '样本外天数'}
                  type="number"
                  value={form.outOfSampleDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, outOfSampleDays: Number(e.target.value) }))
                  }
                  helperText={isRollingMode ? 'Rolling 每段持有/评估周期' : '20–504 交易日'}
                />
                <TextField
                  fullWidth
                  size="small"
                  label="步进天数"
                  type="number"
                  value={form.stepDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, stepDays: Number(e.target.value) }))
                  }
                  helperText="20–504 交易日"
                />

                <FormControl size="small" fullWidth>
                  <InputLabel id="walk-forward-optimize-metric-label">优化指标</InputLabel>
                  <Select
                    id="walk-forward-optimize-metric"
                    name="optimizeMetric"
                    labelId="walk-forward-optimize-metric-label"
                    label="优化指标"
                    value={form.optimizeMetric}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, optimizeMetric: e.target.value }))
                    }
                  >
                    {OPTIMIZE_METRIC_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </CardContent>
          </Card>

          {!isRollingMode && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <WalkForwardAdvancedFields
                  purgeDays={form.purgeDays}
                  embargoDays={form.embargoDays}
                  minOosTrades={form.minOosTrades}
                  onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
                />
              </CardContent>
            </Card>
          )}

          <Box sx={{ mb: 3 }}>
            <WalkForwardWindowPreview
              fullStartDate={form.fullStartDate}
              fullEndDate={form.fullEndDate}
              inSampleDays={form.inSampleDays}
              outOfSampleDays={form.outOfSampleDays}
              stepDays={form.stepDays}
              purgeDays={isRollingMode ? 0 : form.purgeDays}
              embargoDays={isRollingMode ? 0 : form.embargoDays}
              paramSearchSpace={form.paramSearchSpace}
            />
          </Box>

          {/* Common params */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                通用参数
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                  <InputLabel id="walk-forward-benchmark-label">基准指数</InputLabel>
                  <Select
                    id="walk-forward-benchmark"
                    name="benchmarkTsCode"
                    labelId="walk-forward-benchmark-label"
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
                  <InputLabel id="walk-forward-universe-label">股票池</InputLabel>
                  <Select
                    id="walk-forward-universe"
                    name="universe"
                    labelId="walk-forward-universe-label"
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

                <FormControl size="small" fullWidth>
                  <InputLabel id="walk-forward-rebalance-label">调仓频率</InputLabel>
                  <Select
                    id="walk-forward-rebalance"
                    name="rebalanceFrequency"
                    labelId="walk-forward-rebalance-label"
                    label="调仓频率"
                    value={form.rebalanceFrequency}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, rebalanceFrequency: e.target.value }))
                    }
                  >
                    {REBALANCE_FREQUENCY_OPTIONS.map((o) => (
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
            disabled={submitting || !hasSearchSpace}
            onClick={handleSubmit}
            startIcon={<Iconify icon="solar:play-circle-bold" width={20} />}
          >
            {submitting
              ? '提交中…'
              : isRollingMode
                ? '提交 Rolling 任务'
                : '提交 Walk-Forward 任务'}
          </Button>

          {!hasSearchSpace && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ mt: 1, display: 'block', textAlign: 'center' }}
            >
              请至少启用一个参数搜索空间
            </Typography>
          )}
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
