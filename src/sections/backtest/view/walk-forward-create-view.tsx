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

import { createWalkForwardRun } from 'src/api/backtest';
import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';

import { BacktestStrategyConfigPanel } from '../backtest-strategy-config-panel';
import { WalkForwardParamSpaceEditor } from '../walk-forward-param-space-editor';
import {
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
    if (updates.strategyConfig !== undefined) {
      setForm((prev) => ({ ...prev, baseStrategyConfig: updates.strategyConfig! }));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError('');
    try {
      const toApiDate = (d: string) => d.replace(/-/g, '');
      const res = await createWalkForwardRun({
        name: form.name || undefined,
        baseStrategyType: form.baseStrategyType as any,
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
      });
      router.push(`/backtest/walk-forward/${res.wfRunId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, router]);

  const availableParams = STRATEGY_PARAMS[form.baseStrategyType] ?? [];

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
        <Typography variant="h4">新建 Walk-Forward 任务</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

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
                  fullWidth
                  size="small"
                  label="任务名称（可选）"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />

                <FormControl size="small" fullWidth>
                  <InputLabel>策略类型</InputLabel>
                  <Select
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
                WF 窗口设置
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="全量开始日期"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={form.fullStartDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fullStartDate: e.target.value }))
                    }
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="全量结束日期"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={form.fullEndDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullEndDate: e.target.value }))}
                  />
                </Box>

                <TextField
                  fullWidth
                  size="small"
                  label="样本内天数"
                  type="number"
                  value={form.inSampleDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, inSampleDays: Number(e.target.value) }))
                  }
                  helperText="60–2520 交易日"
                />
                <TextField
                  fullWidth
                  size="small"
                  label="样本外天数"
                  type="number"
                  value={form.outOfSampleDays}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, outOfSampleDays: Number(e.target.value) }))
                  }
                  helperText="20–504 交易日"
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
                  <InputLabel>优化指标</InputLabel>
                  <Select
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

                <FormControl size="small" fullWidth>
                  <InputLabel>调仓频率</InputLabel>
                  <Select
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
            disabled={submitting || Object.keys(form.paramSearchSpace).length === 0}
            onClick={handleSubmit}
            startIcon={<Iconify icon="solar:play-circle-bold" width={20} />}
          >
            {submitting ? '提交中…' : '提交 Walk-Forward 任务'}
          </Button>

          {Object.keys(form.paramSearchSpace).length === 0 && (
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
