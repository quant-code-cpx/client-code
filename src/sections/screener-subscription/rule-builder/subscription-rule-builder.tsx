import type { ScreenerFilters } from 'src/api/screener';
import type {
  MetricDefinition,
  SubscriptionRuleSpec,
  SubscriptionPreviewResult,
} from 'src/api/screener-subscription';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { ApiError } from 'src/api/client';
import {
  createSubscription,
  updateSubscription,
  getSubscriptionMetrics,
  previewSubscriptionRule,
  validateSubscriptionRule,
} from 'src/api/screener-subscription';

import { SubscriptionRulePreviewPanel } from './subscription-rule-preview-panel';
import { SubscriptionRuleConditionsCard } from './subscription-rule-conditions-card';
import {
  SubscriptionRuleBasicsCard,
  SubscriptionRuleTriggerCard,
  SubscriptionRuleUniverseCard,
} from './subscription-rule-settings-panels';
import {
  buildRuleSpec,
  switchRuleType,
  createBuilderState,
  defaultTriggerSpec,
  countRuleConditions,
  validateBuilderState,
} from './subscription-rule-reducer';

import type { SubscriptionBuilderState } from './subscription-rule-reducer';

// ----------------------------------------------------------------------

type Props = {
  initialState: SubscriptionBuilderState;
  editingId?: number;
  expectedUpdatedAt?: string;
  onBack: () => void;
  onSaved: (id: number) => void;
};

function isDataNotReady(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'DATA_NOT_READY';
}

export function SubscriptionRuleBuilder({
  initialState,
  editingId,
  expectedUpdatedAt,
  onBack,
  onSaved,
}: Props) {
  const [state, setState] = useState(initialState);
  const [catalog, setCatalog] = useState<MetricDefinition[]>([]);
  const [catalogVersion, setCatalogVersion] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<SubscriptionPreviewResult | null>(null);
  const [previewKey, setPreviewKey] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setState(initialState), [initialState]);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError('');
    try {
      const result = await getSubscriptionMetrics();
      setCatalog(result.metrics);
      setCatalogVersion(result.catalogVersion);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : '指标目录加载失败');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const ruleSpec = useMemo(() => buildRuleSpec(state), [state]);
  const currentPreviewKey = useMemo(
    () => JSON.stringify({ catalogVersion, ruleSpec, triggerSpec: state.triggerSpec }),
    [catalogVersion, ruleSpec, state.triggerSpec]
  );
  const validPreview = preview !== null && previewKey === currentPreviewKey;

  const applyRuleType = (nextType: SubscriptionBuilderState['ruleType']) => {
    if (nextType === state.ruleType) return;
    const hasConditions = countRuleConditions(state) > 0;
    if (
      hasConditions &&
      !window.confirm('切换规则来源会保留当前草稿，但不会带入不兼容条件。是否继续？')
    ) {
      return;
    }
    setState((current) => switchRuleType(current, nextType));
    setPreview(null);
  };

  const updateState = (patch: Partial<SubscriptionBuilderState>) => {
    setState((current) => ({ ...current, ...patch }));
    setPreview(null);
  };

  const validateCurrentRule = async (): Promise<boolean> => {
    const errors = validateBuilderState(state);
    setValidationErrors(errors);
    if (errors.length > 0) return false;
    try {
      const result = await validateSubscriptionRule({
        ...(editingId ? { id: editingId } : {}),
        ruleSpec,
        triggerSpec: state.triggerSpec,
        catalogVersion,
      });
      if (result.valid === false) {
        setValidationErrors(['规则校验未通过，请检查条件与指标版本。']);
        return false;
      }
      if (result.hasDuplicate) {
        setValidationErrors([
          `存在相似订阅：${result.similarSubscriptions?.map((item) => item.name).join('、') ?? '请调整规则'}`,
        ]);
        return false;
      }
      return true;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '规则校验失败');
      return false;
    }
  };

  const handlePreview = async () => {
    setSubmitError('');
    if (!(await validateCurrentRule())) return;
    setPreviewLoading(true);
    try {
      const result = await previewSubscriptionRule({
        ruleSpec,
        triggerSpec: state.triggerSpec,
        limit: 20,
      });
      setPreview(result);
      setPreviewKey(currentPreviewKey);
    } catch (error) {
      setPreview(null);
      setSubmitError(
        isDataNotReady(error)
          ? '数据尚未就绪，不能显示为 0 命中；可保存为暂停状态后稍后重试。'
          : error instanceof Error
            ? error.message
            : '规则预览失败'
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitError('');
    if (!(await validateCurrentRule())) return;
    if (state.status === 'ACTIVE' && !validPreview) {
      setSubmitError('请先对当前规则成功运行预览，才能创建活跃订阅。');
      return;
    }
    setSaving(true);
    try {
      const request = {
        name: state.name.trim(),
        frequency: state.frequency,
        status: state.status,
        ruleSpec,
        triggerSpec: state.triggerSpec,
        notificationSpec: {
          inApp: true,
          maxHitsPerNotification: state.triggerSpec.maxHitsPerNotification,
        },
      };
      const saved = editingId
        ? await updateSubscription({ ...request, id: editingId, expectedUpdatedAt })
        : await createSubscription(request);
      onSaved(saved.id);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '保存订阅失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        alignItems="flex-start"
        direction="row"
        flexWrap="wrap"
        gap={2}
        justifyContent="space-between"
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            {editingId ? '编辑条件订阅' : '新建条件订阅'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            指标规则工作台 · 保存前使用同一后端评估器预览实际数据日期和命中证据
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button color="inherit" onClick={onBack} disabled={saving}>
            取消
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || catalogLoading || Boolean(catalogError)}
          >
            {saving ? '保存中…' : editingId ? '保存规则' : '创建订阅'}
          </Button>
        </Stack>
      </Stack>

      {catalogError ? (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={fetchCatalog}>
              重试
            </Button>
          }
        >
          指标目录接口待联调：{catalogError}。规则工作台不会用本地 mock 替代后端目录。
        </Alert>
      ) : null}

      {validationErrors.length > 0 ? (
        <Alert severity="error" onClose={() => setValidationErrors([])}>
          {validationErrors.map((error) => (
            <Box key={error}>{error}</Box>
          ))}
        </Alert>
      ) : null}
      {submitError ? (
        <Alert severity="error" onClose={() => setSubmitError('')}>
          {submitError}
        </Alert>
      ) : null}

      <SubscriptionRuleBasicsCard
        state={state}
        onChange={updateState}
        onRuleTypeChange={applyRuleType}
      />
      <SubscriptionRuleUniverseCard state={state} onChange={updateState} />
      <SubscriptionRuleConditionsCard
        state={state}
        catalog={catalog}
        loading={catalogLoading}
        error={catalogError}
        onChange={updateState}
        onError={setSubmitError}
      />
      <SubscriptionRuleTriggerCard state={state} onChange={updateState} />
      <SubscriptionRulePreviewPanel
        preview={preview}
        loading={previewLoading}
        disabled={catalogLoading || Boolean(catalogError)}
        onPreview={handlePreview}
      />
    </Stack>
  );
}

export function stateFromRuleSpec(input: {
  name?: string;
  frequency?: SubscriptionBuilderState['frequency'];
  status?: SubscriptionBuilderState['status'];
  ruleSpec?: SubscriptionRuleSpec | null;
  triggerSpec?: Partial<SubscriptionBuilderState['triggerSpec']> | null;
  filters?: Partial<ScreenerFilters>;
}): SubscriptionBuilderState {
  const ruleSpec = input.ruleSpec;
  if (ruleSpec?.type === 'STOCK_SCREENING')
    return createBuilderState({
      name: input.name,
      frequency: input.frequency,
      status: input.status,
      ruleType: 'STOCK_SCREENING',
      universe: ruleSpec.universe,
      filters: ruleSpec.filters,
      triggerSpec: { ...defaultTriggerSpec('STOCK_SCREENING'), ...input.triggerSpec },
    });
  if (ruleSpec?.type === 'FACTOR_SCREENING')
    return createBuilderState({
      name: input.name,
      frequency: input.frequency,
      status: input.status,
      ruleType: 'FACTOR_SCREENING',
      universe: ruleSpec.universe,
      factorConditions: ruleSpec.conditions,
      triggerSpec: { ...defaultTriggerSpec('FACTOR_SCREENING'), ...input.triggerSpec },
    });
  if (ruleSpec?.type === 'SIGNAL_EVENT')
    return createBuilderState({
      name: input.name,
      frequency: input.frequency,
      status: input.status,
      ruleType: 'SIGNAL_EVENT',
      universe: ruleSpec.universe,
      signalConditions: ruleSpec.conditions,
      minSatisfied: ruleSpec.minSatisfied,
      triggerSpec: { ...defaultTriggerSpec('SIGNAL_EVENT'), ...input.triggerSpec },
    });
  return createBuilderState({
    name: input.name,
    frequency: input.frequency,
    status: input.status,
    filters: input.filters,
    triggerSpec: { ...defaultTriggerSpec('STOCK_SCREENING'), ...input.triggerSpec },
  });
}
