import type { StrategyTemplate, ValidateBacktestRunResponse } from 'src/api/backtest';
import type { BacktestRunForm } from '../types';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { getStrategyTemplates, validateRun, createRun } from 'src/api/backtest';
import { DashboardContent } from 'src/layouts/dashboard';

import { BacktestTemplateCards } from '../backtest-template-cards';
import { BacktestConfigForm } from '../backtest-config-form';
import { BacktestStrategyConfigPanel } from '../backtest-strategy-config-panel';
import { BacktestValidatePanel } from '../backtest-validate-panel';
import { BacktestSubmitSummary } from '../backtest-submit-summary';
import {
  DEFAULT_FORM,
  DEFAULT_MA_CONFIG,
  DEFAULT_SCREENING_CONFIG,
  DEFAULT_FACTOR_CONFIG,
  DEFAULT_CUSTOM_POOL_CONFIG,
} from '../constants';

// ----------------------------------------------------------------------

const DEFAULT_STRATEGY_CONFIGS: Record<string, Record<string, unknown>> = {
  MA_CROSS_SINGLE: DEFAULT_MA_CONFIG as unknown as Record<string, unknown>,
  SCREENING_ROTATION: DEFAULT_SCREENING_CONFIG as unknown as Record<string, unknown>,
  FACTOR_RANKING: DEFAULT_FACTOR_CONFIG as unknown as Record<string, unknown>,
  CUSTOM_POOL_REBALANCE: DEFAULT_CUSTOM_POOL_CONFIG as unknown as Record<string, unknown>,
};

// ----------------------------------------------------------------------

export function BacktestWorkbenchView() {
  const router = useRouter();

  const [templates, setTemplates] = useState<StrategyTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('SCREENING_ROTATION');

  const [form, setForm] = useState<BacktestRunForm>({
    ...DEFAULT_FORM,
    strategyConfig: DEFAULT_SCREENING_CONFIG as unknown as Record<string, unknown>,
  });

  const [validation, setValidation] = useState<ValidateBacktestRunResponse | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Prefill form from router state (for "copy & re-run" scenario)
  useEffect(() => {
    const state = window.history.state?.usr as Partial<BacktestRunForm & { templateId: string }>;
    if (state?.strategyType) {
      setSelectedTemplateId(state.templateId ?? 'SCREENING_ROTATION');
      setForm((prev) => ({ ...prev, ...state }));
    }
  }, []);

  // Load strategy templates
  useEffect(() => {
    setLoadingTemplates(true);
    getStrategyTemplates()
      .then((res) => setTemplates(res.templates ?? []))
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, []);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);
      setValidation(null);
      setForm((prev) => ({
        ...prev,
        strategyConfig: DEFAULT_STRATEGY_CONFIGS[templateId] ?? {},
      }));
    },
    []
  );

  const handleFormChange = useCallback((updates: Partial<BacktestRunForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setValidation(null);
  }, []);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    setError('');
    try {
      const res = await validateRun({
        strategyType: selectedTemplateId,
        strategyConfig: form.strategyConfig,
        startDate: form.startDate,
        endDate: form.endDate,
        benchmarkTsCode: form.benchmarkTsCode,
        universe: form.universe,
        initialCapital: form.initialCapital,
        rebalanceFrequency: form.rebalanceFrequency,
        priceMode: form.priceMode,
        enableTradeConstraints: form.enableTradeConstraints,
      });
      setValidation(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : '校验失败');
    } finally {
      setValidating(false);
    }
  }, [form, selectedTemplateId]);

  const handleSubmit = useCallback(async () => {
    if (!validation || validation.errors.length > 0) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await createRun({
        name: form.name || undefined,
        strategyType: selectedTemplateId,
        strategyConfig: form.strategyConfig,
        startDate: form.startDate,
        endDate: form.endDate,
        benchmarkTsCode: form.benchmarkTsCode,
        universe: form.universe !== 'CUSTOM' ? form.universe : undefined,
        customUniverseTsCodes:
          form.universe === 'CUSTOM' ? form.customUniverseTsCodes : undefined,
        initialCapital: form.initialCapital,
        rebalanceFrequency: form.rebalanceFrequency,
        priceMode: form.priceMode,
        commissionRate: form.commissionRate,
        stampDutyRate: form.stampDutyRate,
        minCommission: form.minCommission,
        slippageBps: form.slippageBps,
        maxPositions: form.maxPositions,
        maxWeightPerStock: form.maxWeightPerStock,
        minDaysListed: form.minDaysListed,
        enableTradeConstraints: form.enableTradeConstraints,
      });
      router.push(`/backtest/runs/${res.runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [form, selectedTemplateId, validation, router]);

  return (
    <DashboardContent>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4">回测工作台</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          配置策略参数，校验数据完备性，提交回测任务
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Strategy templates */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          选择策略模板
        </Typography>
        {loadingTemplates ? (
          <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Skeleton variant="rounded" height={120} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <BacktestTemplateCards
            templates={
              templates.length > 0
                ? templates
                : [
                    {
                      id: 'MA_CROSS_SINGLE',
                      name: '均线择时',
                      description: '基于双均线金叉死叉对单只股票进行择时',
                      category: 'TECHNICAL',
                      parameterSchema: [],
                    },
                    {
                      id: 'SCREENING_ROTATION',
                      name: '选股轮动',
                      description: '定期选出满足条件的 Top N 只股票等权持有',
                      category: 'SCREENING',
                      parameterSchema: [],
                    },
                    {
                      id: 'FACTOR_RANKING',
                      name: '因子排序',
                      description: '按因子得分对股票池排名，持有 Top N',
                      category: 'FACTOR',
                      parameterSchema: [],
                    },
                    {
                      id: 'CUSTOM_POOL_REBALANCE',
                      name: '自定义股票池',
                      description: '指定股票池，定期按权重再平衡',
                      category: 'CUSTOM',
                      parameterSchema: [],
                    },
                  ]
            }
            selectedTemplateId={selectedTemplateId}
            onSelect={handleTemplateSelect}
          />
        )}
      </Box>

      {/* Main two-column layout */}
      <Grid container spacing={3}>
        {/* Left: config forms */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <BacktestConfigForm form={form} onChange={handleFormChange} />
            <BacktestStrategyConfigPanel
              selectedTemplateId={selectedTemplateId}
              form={form}
              onChange={handleFormChange}
            />
          </Box>
        </Grid>

        {/* Right: validate + submit */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, position: 'sticky', top: 80 }}>
            <BacktestValidatePanel validation={validation} loading={validating} />
            <BacktestSubmitSummary
              form={form}
              selectedTemplateId={selectedTemplateId}
              validation={validation}
              validating={validating}
              submitting={submitting}
              onValidate={handleValidate}
              onSubmit={handleSubmit}
            />
          </Box>
        </Grid>
      </Grid>
    </DashboardContent>
  );
}
