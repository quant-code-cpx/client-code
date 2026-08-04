import type { ScreenerFilters } from 'src/api/screener';
import type {
  MetricDefinition,
  FactorConditionSpec,
  SignalConditionSpec,
  SubscriptionRuleSpec,
  SubscriptionRuleType,
  SubscriptionPreviewResult,
} from 'src/api/screener-subscription';

import { useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Skeleton from '@mui/material/Skeleton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';
import Autocomplete from '@mui/material/Autocomplete';
import ToggleButton from '@mui/material/ToggleButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { fmtTradeDate } from 'src/utils/format-time';

import { ApiError } from 'src/api/client';
import {
  createSubscription,
  updateSubscription,
  getSubscriptionMetrics,
  previewSubscriptionRule,
  validateSubscriptionRule,
} from 'src/api/screener-subscription';

import { Iconify } from 'src/components/iconify';

import { SubscriptionHitEvidenceTable } from '../subscription-hit-evidence';
import {
  buildRuleSpec,
  switchRuleType,
  normalizeTsCodes,
  createBuilderState,
  defaultTriggerSpec,
  countRuleConditions,
  validateBuilderState,
} from './subscription-rule-reducer';

import type { SubscriptionBuilderState } from './subscription-rule-reducer';

// ----------------------------------------------------------------------

const MAX_CONDITIONS = 10;
const SOURCE_BY_RULE_TYPE = {
  STOCK_SCREENING: 'STOCK',
  FACTOR_SCREENING: 'FACTOR',
  SIGNAL_EVENT: 'SIGNAL',
} as const;

const ruleTypeLabels: Record<Exclude<SubscriptionRuleType, 'COMPOSITE'>, string> = {
  STOCK_SCREENING: '基础选股',
  FACTOR_SCREENING: '因子选股',
  SIGNAL_EVENT: '技术信号',
};

const factorOperatorLabels: Record<FactorConditionSpec['operator'], string> = {
  GT: '大于',
  GTE: '大于等于',
  LT: '小于',
  LTE: '小于等于',
  BETWEEN: '区间',
  TOP_PERCENT: '前 N%',
  BOTTOM_PERCENT: '后 N%',
};

const signalEventLabels: Record<SignalConditionSpec['eventType'], string> = {
  GOLDEN_CROSS: '金叉',
  DEATH_CROSS: '死叉',
  OVERBOUGHT_ENTER: '进入超买',
  OVERSOLD_ENTER: '进入超卖',
  BREAK_UP: '向上突破',
  BREAK_DOWN: '向下突破',
  BULLISH_STATE_ENTER: '进入多头状态',
  BEARISH_STATE_ENTER: '进入空头状态',
  VOLUME_EXPAND: '量能放大',
  VOLUME_SHRINK: '量能萎缩',
  SCORE_CROSS_UP: '评分上穿',
  SCORE_CROSS_DOWN: '评分下穿',
};

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

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(' ~ ');
  return value === undefined || value === null ? '' : String(value);
}

function metricDefaultValue(metric: MetricDefinition): string | number | boolean {
  if (metric.valueType === 'BOOLEAN') return false;
  if (metric.valueType === 'ENUM') return metric.enumOptions?.[0]?.value ?? '';
  return metric.min ?? 0;
}

function normalizeMetricId(value: string): keyof ScreenerFilters {
  return value as keyof ScreenerFilters;
}

function stockMetricFilterKey(metric: MetricDefinition): keyof ScreenerFilters {
  return normalizeMetricId(metric.filterKey ?? metric.id);
}

function isMetricAvailable(metric: MetricDefinition): boolean {
  return metric.availability === 'ENABLED';
}

function metricNotReadyMessage(metric: MetricDefinition): string {
  return `「${metric.label}」所需数据尚未就绪，暂不能添加或运行预览。`;
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
  const [stockMetricToAdd, setStockMetricToAdd] = useState<MetricDefinition | null>(null);
  const [factorMetricToAdd, setFactorMetricToAdd] = useState<MetricDefinition | null>(null);
  const [signalMetricToAdd, setSignalMetricToAdd] = useState<MetricDefinition | null>(null);

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
  const sourceMetrics = useMemo(
    () => catalog.filter((metric) => metric.source === SOURCE_BY_RULE_TYPE[state.ruleType]),
    [catalog, state.ruleType]
  );
  const unavailableSourceMetrics = sourceMetrics.filter((metric) => !isMetricAvailable(metric));
  const validPreview = preview !== null && previewKey === currentPreviewKey;
  const conditionCount = countRuleConditions(state);

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

  const addStockMetric = () => {
    if (!stockMetricToAdd || conditionCount >= MAX_CONDITIONS) return;
    if (!isMetricAvailable(stockMetricToAdd)) {
      setSubmitError(metricNotReadyMessage(stockMetricToAdd));
      return;
    }
    const key = stockMetricFilterKey(stockMetricToAdd);
    if (Object.prototype.hasOwnProperty.call(state.filters, key)) return;
    updateState({
      filters: {
        ...state.filters,
        [key]: metricDefaultValue(stockMetricToAdd),
      } as Partial<ScreenerFilters>,
    });
    setStockMetricToAdd(null);
  };

  const addFactorMetric = () => {
    if (!factorMetricToAdd || conditionCount >= MAX_CONDITIONS) return;
    if (!isMetricAvailable(factorMetricToAdd)) {
      setSubmitError(metricNotReadyMessage(factorMetricToAdd));
      return;
    }
    if (state.factorConditions.some((condition) => condition.factorId === factorMetricToAdd.id))
      return;
    updateState({
      factorConditions: [
        ...state.factorConditions,
        { factorId: factorMetricToAdd.id, operator: 'GT', value: factorMetricToAdd.min ?? 0 },
      ],
    });
    setFactorMetricToAdd(null);
  };

  const addSignalMetric = () => {
    if (!signalMetricToAdd || conditionCount >= MAX_CONDITIONS) return;
    if (!isMetricAvailable(signalMetricToAdd)) {
      setSubmitError(metricNotReadyMessage(signalMetricToAdd));
      return;
    }
    if (state.signalConditions.some((condition) => condition.metricId === signalMetricToAdd.id))
      return;
    const event = signalMetricToAdd.operators.find(
      (operator): operator is SignalConditionSpec['eventType'] => operator in signalEventLabels
    );
    if (!event) {
      setSubmitError('指标目录尚未提供可订阅的具体事件，暂不能添加该指标。');
      return;
    }
    updateState({
      signalConditions: [
        ...state.signalConditions,
        { metricId: signalMetricToAdd.id, eventType: event },
      ],
    });
    setSignalMetricToAdd(null);
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
      <Stack alignItems="flex-start" direction="row" flexWrap="wrap" gap={2} justifyContent="space-between">
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

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Tabs value={state.ruleType} onChange={(_, value) => applyRuleType(value)}>
              {(Object.keys(ruleTypeLabels) as SubscriptionBuilderState['ruleType'][]).map((type) => (
                <Tab key={type} value={type} label={ruleTypeLabels[type]} />
              ))}
            </Tabs>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                基础信息
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                订阅在交易日数据就绪后执行。指标信号仅用于研究，不构成投资建议。
              </Typography>
            </Box>
            <TextField
              label="订阅名称"
              value={state.name}
              onChange={(event) => updateState({ name: event.target.value.slice(0, 50) })}
              helperText={`${state.name.length}/50`}
              required
              sx={{ maxWidth: 480 }}
            />
            <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}
                >
                  执行频率
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={state.frequency}
                  onChange={(_, value) => value && updateState({ frequency: value })}
                >
                  <ToggleButton value="DAILY">每日</ToggleButton>
                  <ToggleButton value="WEEKLY">每周</ToggleButton>
                  <ToggleButton value="MONTHLY">每月</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', display: 'block', mb: 0.75 }}
                >
                  创建后状态
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={state.status}
                  onChange={(_, value) => value && updateState({ status: value })}
                >
                  <ToggleButton value="ACTIVE">活跃</ToggleButton>
                  <ToggleButton value="PAUSED">暂停</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <UniversePanel state={state} onChange={updateState} />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
                条件构建
              </Typography>
              <Chip label={`${conditionCount}/${MAX_CONDITIONS}`} size="small" variant="outlined" />
            </Box>
            {catalogLoading ? <Skeleton variant="rounded" height={120} /> : null}
            {!catalogLoading && catalogError ? (
              <Alert severity="info">
                等待后端提供 Metric Catalog 后显示可选择指标。页面布局与提交契约已就绪。
              </Alert>
            ) : null}
            {!catalogLoading && !catalogError && unavailableSourceMetrics.length > 0 ? (
              <Alert severity="warning">
                以下指标所需数据尚未就绪，暂不能添加或运行预览：
                {unavailableSourceMetrics.map((metric) => metric.label).join('、')}。
              </Alert>
            ) : null}
            {!catalogLoading && !catalogError && state.ruleType === 'STOCK_SCREENING' ? (
              <StockRulePanel
                metrics={sourceMetrics}
                selected={stockMetricToAdd}
                filters={state.filters}
                disabled={conditionCount >= MAX_CONDITIONS}
                onSelectedChange={setStockMetricToAdd}
                onAdd={addStockMetric}
                onChange={(filters) => updateState({ filters })}
              />
            ) : null}
            {!catalogLoading && !catalogError && state.ruleType === 'FACTOR_SCREENING' ? (
              <FactorRulePanel
                metrics={sourceMetrics}
                selected={factorMetricToAdd}
                conditions={state.factorConditions}
                disabled={conditionCount >= MAX_CONDITIONS}
                onSelectedChange={setFactorMetricToAdd}
                onAdd={addFactorMetric}
                onChange={(factorConditions) => updateState({ factorConditions })}
              />
            ) : null}
            {!catalogLoading && !catalogError && state.ruleType === 'SIGNAL_EVENT' ? (
              <SignalRulePanel
                metrics={sourceMetrics}
                selected={signalMetricToAdd}
                conditions={state.signalConditions}
                minSatisfied={state.minSatisfied}
                disabled={conditionCount >= MAX_CONDITIONS}
                onSelectedChange={setSignalMetricToAdd}
                onAdd={addSignalMetric}
                onChange={(signalConditions) => updateState({ signalConditions })}
                onMinSatisfiedChange={(minSatisfied) => updateState({ minSatisfied })}
              />
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <TriggerSchedulePanel state={state} onChange={updateState} />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  规则预览
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  预览只读取后端同一评估器，不写入订阅状态，也不发送通知。
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={handlePreview}
                disabled={previewLoading || catalogLoading || Boolean(catalogError)}
              >
                {previewLoading ? '预览中…' : '运行预览'}
              </Button>
            </Box>
            {previewLoading ? <Skeleton variant="rounded" height={220} /> : null}
            {!previewLoading && !preview ? (
              <Alert severity="info">完成规则条件后运行预览；数据未就绪不会被显示为 0 命中。</Alert>
            ) : null}
            {!previewLoading && preview ? <RulePreview preview={preview} /> : null}
          </Stack>
        </CardContent>
      </Card>

    </Stack>
  );
}

type UniversePanelProps = {
  state: SubscriptionBuilderState;
  onChange: (patch: Partial<SubscriptionBuilderState>) => void;
};

function UniversePanel({ state, onChange }: UniversePanelProps) {
  const fixedCodes = state.universe.type === 'FIXED' ? state.universe.tsCodes.join('\n') : '';
  const allA = state.universe.type === 'ALL_A' ? state.universe : null;
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            股票范围与交易约束
          </Typography>
          <TextField
            select
            label="范围"
            value={state.universe.type}
            onChange={(event) => {
              const type = event.target.value;
              if (type === 'FIXED') onChange({ universe: { type: 'FIXED', tsCodes: [] } });
              else
                onChange({
                  universe: {
                    type: 'ALL_A',
                    excludeSt: true,
                    excludeSuspended: true,
                    excludeBse: false,
                  },
                });
            }}
            sx={{ maxWidth: 300 }}
          >
            <MenuItem value="ALL_A">全 A 股</MenuItem>
            <MenuItem value="FIXED">固定股票</MenuItem>
          </TextField>
          {allA ? (
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={allA.excludeSt}
                    onChange={(event) =>
                      onChange({ universe: { ...allA, excludeSt: event.target.checked } })
                    }
                  />
                }
                label="排除 ST"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={allA.excludeSuspended}
                    onChange={(event) =>
                      onChange({ universe: { ...allA, excludeSuspended: event.target.checked } })
                    }
                  />
                }
                label="排除停牌"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={allA.excludeBse}
                    onChange={(event) =>
                      onChange({ universe: { ...allA, excludeBse: event.target.checked } })
                    }
                  />
                }
                label="排除北交所"
              />
            </Stack>
          ) : (
            <TextField
              label="股票代码"
              multiline
              minRows={3}
              value={fixedCodes}
              onChange={(event) =>
                onChange({
                  universe: { type: 'FIXED', tsCodes: normalizeTsCodes(event.target.value) },
                })
              }
              helperText="每行或逗号分隔；最多 100 只，例如 600519.SH"
            />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

type StockRulePanelProps = {
  metrics: MetricDefinition[];
  selected: MetricDefinition | null;
  filters: Partial<ScreenerFilters>;
  disabled: boolean;
  onSelectedChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
  onChange: (filters: Partial<ScreenerFilters>) => void;
};

function StockRulePanel({
  metrics,
  selected,
  filters,
  disabled,
  onSelectedChange,
  onAdd,
  onChange,
}: StockRulePanelProps) {
  const selectedIds = new Set(Object.keys(filters));
  return (
    <Stack spacing={1.5}>
      <AddMetricControl
        metrics={metrics.filter((metric) => !selectedIds.has(stockMetricFilterKey(metric)))}
        value={selected}
        onChange={onSelectedChange}
        onAdd={onAdd}
        disabled={disabled}
      />
      {Object.entries(filters).map(([id, value]) => {
        const metric = metrics.find((item) => stockMetricFilterKey(item) === id || item.id === id);
        if (!metric) return null;
        return (
          <StockConditionRow
            key={id}
            metric={metric}
            value={value}
            onChange={(next) => {
              const nextFilters = { ...filters };
              delete nextFilters[normalizeMetricId(id)];
              onChange({ ...nextFilters, [stockMetricFilterKey(metric)]: next } as Partial<ScreenerFilters>);
            }}
            onRemove={() => {
              const next = { ...filters };
              delete next[normalizeMetricId(id)];
              onChange(next);
            }}
          />
        );
      })}
    </Stack>
  );
}

type FactorRulePanelProps = {
  metrics: MetricDefinition[];
  selected: MetricDefinition | null;
  conditions: FactorConditionSpec[];
  disabled: boolean;
  onSelectedChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
  onChange: (conditions: FactorConditionSpec[]) => void;
};

function FactorRulePanel({
  metrics,
  selected,
  conditions,
  disabled,
  onSelectedChange,
  onAdd,
  onChange,
}: FactorRulePanelProps) {
  const selectedIds = new Set(conditions.map((condition) => condition.factorId));
  return (
    <Stack spacing={1.5}>
      <AddMetricControl
        metrics={metrics.filter((metric) => !selectedIds.has(metric.id))}
        value={selected}
        onChange={onSelectedChange}
        onAdd={onAdd}
        disabled={disabled}
      />
      {conditions.map((condition, index) => {
        const metric = metrics.find((item) => item.id === condition.factorId);
        if (!metric) return null;
        const isRange = condition.operator === 'BETWEEN';
        const value = Array.isArray(condition.value)
          ? condition.value
          : [condition.value, condition.value];
        return (
          <ConditionFrame
            key={condition.factorId}
            onRemove={() => onChange(conditions.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Typography variant="subtitle2" sx={{ minWidth: 220 }}>
              {metric.label}
            </Typography>
            <TextField
              select
              size="small"
              label="比较"
              value={condition.operator}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          operator: event.target.value as FactorConditionSpec['operator'],
                          value:
                            event.target.value === 'BETWEEN'
                              ? [Number(item.value), Number(item.value)]
                              : Number(Array.isArray(item.value) ? item.value[0] : item.value),
                        }
                      : item
                  )
                )
              }
              sx={{ minWidth: 150 }}
            >
              {metric.operators
                .filter(
                  (operator): operator is FactorConditionSpec['operator'] =>
                    operator in factorOperatorLabels
                )
                .map((operator) => (
                  <MenuItem key={operator} value={operator}>
                    {factorOperatorLabels[operator]}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label={isRange ? '最小值' : '阈值'}
              value={isRange ? value[0] : condition.value}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          value: isRange
                            ? [Number(event.target.value), value[1]]
                            : Number(event.target.value),
                        }
                      : item
                  )
                )
              }
              sx={{ width: 140 }}
            />
            {isRange ? (
              <TextField
                size="small"
                type="number"
                label="最大值"
                value={value[1]}
                onChange={(event) =>
                  onChange(
                    conditions.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: [value[0], Number(event.target.value)] }
                        : item
                    )
                  )
                }
                sx={{ width: 140 }}
              />
            ) : null}
          </ConditionFrame>
        );
      })}
    </Stack>
  );
}

type SignalRulePanelProps = {
  metrics: MetricDefinition[];
  selected: MetricDefinition | null;
  conditions: SignalConditionSpec[];
  minSatisfied: number;
  disabled: boolean;
  onSelectedChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
  onChange: (conditions: SignalConditionSpec[]) => void;
  onMinSatisfiedChange: (value: number) => void;
};

function SignalRulePanel({
  metrics,
  selected,
  conditions,
  minSatisfied,
  disabled,
  onSelectedChange,
  onAdd,
  onChange,
  onMinSatisfiedChange,
}: SignalRulePanelProps) {
  const selectedIds = new Set(conditions.map((condition) => condition.metricId));
  return (
    <Stack spacing={1.5}>
      <AddMetricControl
        metrics={metrics.filter((metric) => !selectedIds.has(metric.id))}
        value={selected}
        onChange={onSelectedChange}
        onAdd={onAdd}
        disabled={disabled}
      />
      {conditions.map((condition, index) => {
        const metric = metrics.find((item) => item.id === condition.metricId);
        if (!metric) return null;
        const events = metric.operators.filter(
          (operator): operator is SignalConditionSpec['eventType'] => operator in signalEventLabels
        );
        return (
          <ConditionFrame
            key={condition.metricId}
            onRemove={() => onChange(conditions.filter((_, itemIndex) => itemIndex !== index))}
          >
            <Typography variant="subtitle2" sx={{ minWidth: 220 }}>
              {metric.label}
            </Typography>
            <TextField
              select
              size="small"
              label="事件"
              value={condition.eventType}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          eventType: event.target.value as SignalConditionSpec['eventType'],
                        }
                      : item
                  )
                )
              }
              sx={{ minWidth: 180 }}
            >
              {events.map((event) => (
                <MenuItem key={event} value={event}>
                  {signalEventLabels[event]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              type="number"
              label="强度下限（可选）"
              value={condition.strengthAtLeast ?? ''}
              onChange={(event) =>
                onChange(
                  conditions.map((item, itemIndex) =>
                    itemIndex === index
                      ? {
                          ...item,
                          strengthAtLeast:
                            event.target.value === '' ? undefined : Number(event.target.value),
                        }
                      : item
                  )
                )
              }
              sx={{ width: 160 }}
            />
          </ConditionFrame>
        );
      })}
      {conditions.length > 0 ? (
        <TextField
          size="small"
          type="number"
          label="至少满足 N 条"
          value={Math.min(minSatisfied, conditions.length)}
          onChange={(event) =>
            onMinSatisfiedChange(
              Math.max(1, Math.min(Number(event.target.value), conditions.length))
            )
          }
          slotProps={{ htmlInput: { min: 1, max: conditions.length } }}
          sx={{ width: 180 }}
        />
      ) : null}
    </Stack>
  );
}

type AddMetricControlProps = {
  metrics: MetricDefinition[];
  value: MetricDefinition | null;
  disabled: boolean;
  onChange: (value: MetricDefinition | null) => void;
  onAdd: () => void;
};

function AddMetricControl({ metrics, value, disabled, onChange, onAdd }: AddMetricControlProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Autocomplete
        options={metrics}
        value={value}
        onChange={(_, next) => onChange(next)}
        getOptionLabel={(metric) => `${metric.category} · ${metric.label}`}
        getOptionDisabled={(metric) => !isMetricAvailable(metric)}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        renderInput={(params) => <TextField {...params} size="small" label="搜索并添加指标" />}
        sx={{ minWidth: 280, maxWidth: 440, flexGrow: 1 }}
      />
      <Button
        variant="outlined"
        startIcon={<Iconify icon="solar:add-circle-bold" />}
        onClick={onAdd}
        disabled={!value || disabled || !isMetricAvailable(value)}
      >
        添加条件
      </Button>
    </Stack>
  );
}

type StockConditionRowProps = {
  metric: MetricDefinition;
  value: unknown;
  onChange: (value: string | number | boolean) => void;
  onRemove: () => void;
};

function StockConditionRow({ metric, value, onChange, onRemove }: StockConditionRowProps) {
  return (
    <ConditionFrame onRemove={onRemove}>
      <Typography variant="subtitle2" sx={{ minWidth: 220 }}>
        {metric.label}
      </Typography>
      {metric.valueType === 'BOOLEAN' ? (
        <FormControlLabel
          control={
            <Switch checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
          }
          label="启用"
        />
      ) : null}
      {metric.valueType === 'ENUM' ? (
        <TextField
          select
          size="small"
          label="取值"
          value={displayValue(value)}
          onChange={(event) => onChange(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          {(metric.enumOptions ?? []).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ) : null}
      {metric.valueType === 'NUMBER' || metric.valueType === 'PERCENT' ? (
        <TextField
          size="small"
          type="number"
          label={metric.unit ? `阈值（${metric.unit}）` : '阈值'}
          value={displayValue(value)}
          onChange={(event) => onChange(Number(event.target.value))}
          slotProps={{
            htmlInput: {
              min: metric.min,
              max: metric.max,
              step: metric.precision ? 10 ** -metric.precision : 'any',
            },
          }}
          sx={{ width: 180 }}
        />
      ) : null}
    </ConditionFrame>
  );
}

type ConditionFrameProps = { children: ReactNode; onRemove: () => void };

function ConditionFrame({ children, onRemove }: ConditionFrameProps) {
  return (
    <Box
      sx={{
        py: 1.5,
        pl: 2,
        gap: 1.5,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        borderLeft: '3px solid',
        borderColor: 'primary.main',
        bgcolor: 'background.neutral',
        borderRadius: 1,
      }}
    >
      {children}
      <Box sx={{ flexGrow: 1 }} />
      <IconButton aria-label="删除条件" color="error" onClick={onRemove}>
        <Iconify icon="solar:trash-bin-trash-bold" />
      </IconButton>
    </Box>
  );
}

type TriggerSchedulePanelProps = {
  state: SubscriptionBuilderState;
  onChange: (patch: Partial<SubscriptionBuilderState>) => void;
};

function TriggerSchedulePanel({ state, onChange }: TriggerSchedulePanelProps) {
  const isSignal = state.ruleType === 'SIGNAL_EVENT';
  const modes = isSignal ? (['EVENT'] as const) : (['ENTER', 'EXIT', 'BOTH'] as const);
  const trigger = state.triggerSpec;
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            触发与通知
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={trigger.mode}
            onChange={(_, mode) => mode && onChange({ triggerSpec: { ...trigger, mode } })}
          >
            {modes.map((mode) => (
              <ToggleButton key={mode} value={mode}>
                {mode === 'ENTER'
                  ? '新进入'
                  : mode === 'EXIT'
                    ? '退出'
                    : mode === 'BOTH'
                      ? '进入和退出'
                      : '事件出现'}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={
                <Switch
                  checked={trigger.notifyOnInitialMatch}
                  onChange={(event) =>
                    onChange({
                      triggerSpec: { ...trigger, notifyOnInitialMatch: event.target.checked },
                    })
                  }
                />
              }
              label={isSignal ? '当天首次事件通知' : '首次执行也通知'}
            />
            {isSignal ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={trigger.eventWindow === 'SINCE_LAST_SUCCESS'}
                    onChange={(event) =>
                      onChange({
                        triggerSpec: {
                          ...trigger,
                          eventWindow: event.target.checked
                            ? 'SINCE_LAST_SUCCESS'
                            : 'CURRENT_TRADE_DATE',
                        },
                      })
                    }
                  />
                }
                label="聚合上次成功执行后的交易日事件"
              />
            ) : null}
            <TextField
              size="small"
              type="number"
              label="通知摘要上限"
              value={trigger.maxHitsPerNotification}
              onChange={(event) =>
                onChange({
                  triggerSpec: {
                    ...trigger,
                    maxHitsPerNotification: Math.max(1, Math.min(Number(event.target.value), 100)),
                  },
                })
              }
              slotProps={{ htmlInput: { min: 1, max: 100 } }}
              sx={{ width: 180 }}
            />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function RulePreview({ preview }: { preview: SubscriptionPreviewResult }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
        <Typography variant="body2">
          数据日期：<strong>{fmtTradeDate(preview.asOfTradeDate)}</strong>
        </Typography>
        <Typography variant="body2">
          样本：<strong>{preview.universeCount}</strong>
        </Typography>
        <Typography variant="body2">
          命中：<strong>{preview.matchedCount}</strong>
        </Typography>
        <Typography variant="body2">
          耗时：<strong>{preview.executionMs}ms</strong>
        </Typography>
      </Stack>
      {preview.warnings.map((warning) => (
        <Alert key={warning.code} severity="warning">
          {warning.message}
        </Alert>
      ))}
      {preview.truncated ? (
        <Alert severity="info">仅展示前 {preview.matchedStocks.length} 条；命中总数未截断。</Alert>
      ) : null}
      <SubscriptionHitEvidenceTable evidence={preview.evidence} />
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
