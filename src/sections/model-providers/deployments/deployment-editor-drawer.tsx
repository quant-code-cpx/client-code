import type { IconifyName } from 'src/components/iconify';
import type {
  ModelProbeStep,
  ModelConnection,
  ModelDeployment,
  ModelProbeResult,
  ModelReasoningMode,
  ModelProviderDataClass,
  ModelAdapterDefinition,
  ModelProviderCapability,
  CreateModelDeploymentPayload,
} from 'src/api/model-provider';

import { useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Accordion from '@mui/material/Accordion';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';

import {
  probeModelDeployment,
  createModelDeployment,
  updateModelDeployment,
} from 'src/api/model-provider';

import { Iconify } from 'src/components/iconify';

import {
  apiFieldErrors,
  hasFieldErrors,
  validateDeploymentFields,
  type ModelProviderFieldErrors,
} from '../model-provider.validation';
import {
  PROBE_STEP_LABELS,
  DATA_CLASS_OPTIONS,
  CAPABILITY_OPTIONS,
  REASONING_MODE_LABELS,
  COMMON_REASONING_EFFORTS,
  REASONING_EFFORT_PATTERN,
} from '../model-provider.constants';

type DeploymentDraft = CreateModelDeploymentPayload & { customEffort: string };

const PROBE_STEP_APPEARANCE = {
  PASSED: { icon: 'solar:check-circle-bold', color: 'success.main', label: '通过' },
  FAILED: { icon: 'solar:danger-triangle-bold', color: 'error.main', label: '失败' },
  SKIPPED: { icon: 'solar:info-circle-bold', color: 'info.main', label: '未执行' },
} satisfies Record<
  ModelProbeStep['status'],
  { icon: IconifyName; color: string; label: string }
>;

const EMPTY_DRAFT: DeploymentDraft = {
  connectionId: '',
  modelId: '',
  displayName: '',
  priority: 10,
  costTier: 'MEDIUM',
  contextWindow: 128000,
  maxOutputTokens: 8192,
  capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING'],
  reasoningMode: 'AUTO',
  reasoningEfforts: ['LOW', 'MEDIUM', 'HIGH'],
  defaultReasoningEffort: 'MEDIUM',
  dataClasses: ['PUBLIC', 'USER_PRIVATE'],
  timeoutMs: 120000,
  maxRetries: 2,
  retryBaseMs: 200,
  enabled: false,
  customEffort: '',
};

export function DeploymentEditorDrawer({
  open,
  deployment,
  connections,
  adapters,
  onClose,
  onChanged,
}: {
  open: boolean;
  deployment?: ModelDeployment;
  connections: ModelConnection[];
  adapters: ModelAdapterDefinition[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<DeploymentDraft>(EMPTY_DRAFT);
  const [saved, setSaved] = useState<ModelDeployment | undefined>(deployment);
  const [fieldErrors, setFieldErrors] = useState<ModelProviderFieldErrors>({});
  const [message, setMessage] = useState('');
  const [probe, setProbe] = useState<ModelProbeResult | null>(null);
  const [busy, setBusy] = useState(false);

  const connection = useMemo(
    () => connections.find((item) => item.id === draft.connectionId),
    [connections, draft.connectionId]
  );
  const adapter = useMemo(
    () => adapters.find((item) => item.kind === connection?.adapterKind),
    [adapters, connection?.adapterKind]
  );

  useEffect(() => {
    if (!open) return;
    const initialConnection =
      connections.find((item) => item.id === deployment?.connectionId) ??
      connections.find((item) => item.enabled) ??
      connections[0];
    const initialAdapter = adapters.find((item) => item.kind === initialConnection?.adapterKind);
    setDraft(
      deployment
        ? {
            connectionId: deployment.connectionId,
            modelId: deployment.modelId,
            displayName: deployment.displayName,
            priority: deployment.priority,
            costTier: deployment.costTier,
            contextWindow: deployment.contextWindow,
            maxOutputTokens: deployment.maxOutputTokens,
            capabilities: [...deployment.capabilities],
            reasoningMode: deployment.reasoningMode,
            reasoningEfforts: [...deployment.reasoningEfforts],
            ...(deployment.defaultReasoningEffort
              ? { defaultReasoningEffort: deployment.defaultReasoningEffort }
              : {}),
            ...(deployment.reasoningBudgetTokens
              ? { reasoningBudgetTokens: deployment.reasoningBudgetTokens }
              : {}),
            dataClasses: [...deployment.dataClasses],
            timeoutMs: deployment.timeoutMs,
            maxRetries: deployment.maxRetries,
            retryBaseMs: deployment.retryBaseMs,
            enabled: deployment.enabled,
            customEffort: '',
          }
        : {
            ...EMPTY_DRAFT,
            connectionId: initialConnection?.id ?? '',
            reasoningEfforts: initialAdapter?.builtInEfforts.length
              ? [...initialAdapter.builtInEfforts]
              : [...EMPTY_DRAFT.reasoningEfforts],
            capabilities: [...EMPTY_DRAFT.capabilities],
          }
    );
    setSaved(deployment);
    setFieldErrors({});
    setMessage('');
    setProbe(null);
  }, [adapters, connections, deployment, open]);

  const update = <K extends keyof DeploymentDraft>(key: K, value: DeploymentDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const changeConnection = (connectionId: string) => {
    const nextConnection = connections.find((item) => item.id === connectionId);
    const nextAdapter = adapters.find((item) => item.kind === nextConnection?.adapterKind);
    setDraft((current) => ({
      ...current,
      connectionId,
      reasoningMode: 'AUTO',
      reasoningEfforts: nextAdapter?.builtInEfforts.length ? [...nextAdapter.builtInEfforts] : [],
      defaultReasoningEffort: nextAdapter?.builtInEfforts.includes('MEDIUM')
        ? 'MEDIUM'
        : nextAdapter?.builtInEfforts[0],
      reasoningBudgetTokens: undefined,
    }));
  };

  const toggleCapability = (value: ModelProviderCapability) => {
    if (value === 'STREAMING') return;
    update(
      'capabilities',
      draft.capabilities.includes(value)
        ? draft.capabilities.filter((item) => item !== value)
        : [...draft.capabilities, value]
    );
  };

  const toggleDataClass = (value: ModelProviderDataClass) => {
    update(
      'dataClasses',
      draft.dataClasses.includes(value)
        ? draft.dataClasses.filter((item) => item !== value)
        : [...draft.dataClasses, value]
    );
  };

  const addCustomEffort = () => {
    const value = draft.customEffort.trim();
    if (!REASONING_EFFORT_PATTERN.test(value)) {
      setFieldErrors((current) => ({
        ...current,
        reasoningEfforts: '自定义档位仅允许字母、数字及 . _ : -',
      }));
      return;
    }
    if (!draft.reasoningEfforts.some((item) => item.toLowerCase() === value.toLowerCase())) {
      update('reasoningEfforts', [...draft.reasoningEfforts, value]);
    }
    update('customEffort', '');
  };

  const saveDraft = async () => {
    const errors = validateDeploymentFields(draft);
    if (!draft.connectionId) errors.connectionId = '请选择供应商连接';
    if (!draft.capabilities.includes('STREAMING')) errors.capabilities = '流式输出是网关必需能力';
    if (!draft.dataClasses.length) errors.dataClasses = '至少选择一个数据分类';
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;
    setBusy(true);
    setMessage('');
    const payload: CreateModelDeploymentPayload = {
      connectionId: draft.connectionId,
      modelId: draft.modelId,
      displayName: draft.displayName,
      priority: draft.priority,
      costTier: draft.costTier,
      contextWindow: draft.contextWindow,
      maxOutputTokens: draft.maxOutputTokens,
      capabilities: draft.capabilities,
      reasoningMode: draft.reasoningMode,
      reasoningEfforts: draft.reasoningEfforts,
      ...(draft.defaultReasoningEffort
        ? { defaultReasoningEffort: draft.defaultReasoningEffort }
        : {}),
      ...(draft.reasoningBudgetTokens
        ? { reasoningBudgetTokens: draft.reasoningBudgetTokens }
        : {}),
      dataClasses: draft.dataClasses,
      timeoutMs: draft.timeoutMs,
      maxRetries: draft.maxRetries,
      retryBaseMs: draft.retryBaseMs,
    };
    try {
      const result = saved
        ? await updateModelDeployment({
            ...payload,
            id: saved.id,
            version: saved.version,
            modelId: payload.modelId.trim(),
            displayName: payload.displayName.trim(),
          })
        : await createModelDeployment({
            ...payload,
            enabled: false,
            modelId: payload.modelId.trim(),
            displayName: payload.displayName.trim(),
          });
      setSaved(result);
      setProbe(null);
      setMessage('模型部署已保存；当前启用状态与已有探测记录保持不变。可按需执行深度探测；后续调用失败会返回具体原因。');
      await onChanged();
    } catch (error) {
      setFieldErrors((current) => ({ ...current, ...apiFieldErrors(error) }));
      setMessage(error instanceof Error ? error.message : '保存模型部署失败');
    } finally {
      setBusy(false);
    }
  };

  const runProbe = async () => {
    if (!saved) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await probeModelDeployment(saved.id, true);
      setProbe(result);
      const failedStep = result.steps.find((step) => step.status === 'FAILED');
      setMessage(
        result.status === 'PASSED'
          ? '深度探测通过，可以启用部署。'
          : `深度探测失败：${failedStep?.message ?? '请检查模型 ID 与能力配置。'}`
      );
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '深度探测失败');
    } finally {
      setBusy(false);
    }
  };

  const enableDeployment = async () => {
    if (!saved || probe?.status !== 'PASSED') return;
    setBusy(true);
    try {
      const result = await updateModelDeployment({ id: saved.id, version: saved.version, enabled: true });
      setSaved(result);
      setMessage('模型部署已启用，并已同步到活动路由。');
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '启用模型部署失败');
    } finally {
      setBusy(false);
    }
  };

  const reasoningModes = adapter?.reasoningModes ?? (Object.keys(REASONING_MODE_LABELS) as ModelReasoningMode[]);
  const knownEfforts = Array.from(new Set([...(adapter?.builtInEfforts ?? COMMON_REASONING_EFFORTS), ...draft.reasoningEfforts]));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 680 }, maxWidth: '100%' } } }}
    >
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{deployment ? '编辑模型部署' : '新建模型部署'}</Typography>
          <Typography variant="body2" color="text.secondary">
            模型 ID、能力、推理策略和路由参数
          </Typography>
        </Box>
        <Tooltip title="关闭模型部署编辑器">
          <span>
            <IconButton aria-label="关闭模型部署编辑器" onClick={onClose} disabled={busy}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Divider />
      <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
        <Stack spacing={2.25}>
          {message ? <Alert severity={probe?.status === 'FAILED' ? 'error' : 'info'}>{message}</Alert> : null}
          <TextField
            select
            label="供应商连接"
            value={draft.connectionId}
            onChange={(event) => changeConnection(event.target.value)}
            slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
            error={Boolean(fieldErrors.connectionId)}
            helperText={fieldErrors.connectionId ?? (connection?.enabled ? '连接已启用' : '连接尚未启用，部署只能保存为草稿')}
            required
          >
            <option value="" disabled>
              请选择连接
            </option>
            {connections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName} · {item.adapterKind}
              </option>
            ))}
          </TextField>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="模型 ID"
              name="modelId"
              value={draft.modelId}
              onChange={(event) => update('modelId', event.target.value)}
              error={Boolean(fieldErrors.modelId)}
              helperText={fieldErrors.modelId ?? '支持 gpt-5.6-sol、openai/gpt-* 等安全标点'}
              required
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              label="显示名称"
              name="deploymentDisplayName"
              value={draft.displayName}
              onChange={(event) => update('displayName', event.target.value)}
              error={Boolean(fieldErrors.displayName)}
              helperText={fieldErrors.displayName ?? 'Agent 工作台中展示的名称'}
              required
              autoComplete="off"
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              能力声明
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {CAPABILITY_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  color={draft.capabilities.includes(option.value) ? 'primary' : 'default'}
                  variant={draft.capabilities.includes(option.value) ? 'filled' : 'outlined'}
                  onClick={() => toggleCapability(option.value)}
                  aria-pressed={draft.capabilities.includes(option.value)}
                  icon={
                    <Iconify
                      icon={draft.capabilities.includes(option.value) ? 'solar:check-circle-bold' : 'solar:info-circle-bold'}
                      width={18}
                      aria-hidden="true"
                    />
                  }
                />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
              这里由管理员声明模型能力，不受适配器预设限制；若供应商实际不支持，调用时会返回明确提示。
            </Typography>
            {fieldErrors.capabilities ? (
              <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                {fieldErrors.capabilities}
              </Typography>
            ) : null}
          </Box>

          <Divider />
          <Box>
            <Typography variant="subtitle2">推理控制</Typography>
            <Typography variant="caption" color="text.secondary">
              “支持的档位”与“默认运行策略”分开配置；高级原生档位保存后可按需探测。
            </Typography>
          </Box>
          <TextField
            select
            label="控制模式"
            value={draft.reasoningMode}
            onChange={(event) => update('reasoningMode', event.target.value as ModelReasoningMode)}
            slotProps={{ select: { native: true } }}
          >
            {reasoningModes.map((mode) => (
              <option key={mode} value={mode}>
                {REASONING_MODE_LABELS[mode]}
              </option>
            ))}
          </TextField>

          {draft.reasoningMode === 'EFFORT' || draft.reasoningMode === 'TOKEN_BUDGET' ? (
            <>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
                  支持的推理档位
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {knownEfforts.map((effort) => {
                    const selected = draft.reasoningEfforts.some((item) => item.toLowerCase() === effort.toLowerCase());
                    return (
                      <Chip
                        key={effort}
                        label={effort.toLowerCase()}
                        color={selected ? 'primary' : 'default'}
                        variant={selected ? 'filled' : 'outlined'}
                        onClick={() =>
                          update(
                            'reasoningEfforts',
                            selected
                              ? draft.reasoningEfforts.filter((item) => item.toLowerCase() !== effort.toLowerCase())
                              : [...draft.reasoningEfforts, effort]
                          )
                        }
                        aria-pressed={selected}
                      />
                    );
                  })}
                </Stack>
                {fieldErrors.reasoningEfforts ? (
                  <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
                    {fieldErrors.reasoningEfforts}
                  </Typography>
                ) : null}
              </Box>
              <TextField
                select
                label="默认推理档位"
                value={draft.defaultReasoningEffort ?? ''}
                onChange={(event) => update('defaultReasoningEffort', event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
                error={Boolean(fieldErrors.defaultReasoningEffort)}
                helperText={fieldErrors.defaultReasoningEffort ?? '未显式覆盖的模型调用会采用此档位'}
              >
                <option value="">请选择推理档位</option>
                {draft.reasoningEfforts.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort.toLowerCase()}
                  </option>
                ))}
              </TextField>
            </>
          ) : null}

          {draft.reasoningMode === 'TOKEN_BUDGET' ? (
            <TextField
              type="number"
              label="推理 Token 预算"
              value={draft.reasoningBudgetTokens ?? ''}
              onChange={(event) => update('reasoningBudgetTokens', Number(event.target.value))}
              error={Boolean(fieldErrors.reasoningBudgetTokens)}
              helperText={fieldErrors.reasoningBudgetTokens ?? '仅对支持 budget_tokens 的模型生效'}
              slotProps={{ htmlInput: { min: 1, max: draft.maxOutputTokens - 1 } }}
            />
          ) : null}

          <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
              <Typography variant="subtitle2">高级：供应商原生档位</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  size="small"
                  label="原生档位"
                  name="customReasoningEffort"
                  value={draft.customEffort}
                  onChange={(event) => update('customEffort', event.target.value)}
                  helperText="例如 vendor_ultra；如需核实供应商支持情况，可执行深度探测"
                  sx={{ flex: 1 }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <Button variant="outlined" onClick={addCustomEffort} sx={{ alignSelf: 'flex-start' }}>
                  添加档位
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              允许处理的数据
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {DATA_CLASS_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  color={draft.dataClasses.includes(option.value) ? 'primary' : 'default'}
                  variant={draft.dataClasses.includes(option.value) ? 'filled' : 'outlined'}
                  onClick={() => toggleDataClass(option.value)}
                  aria-pressed={draft.dataClasses.includes(option.value)}
                />
              ))}
            </Stack>
          </Box>

          <Accordion variant="outlined" disableGutters>
            <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
              <Typography variant="subtitle2">运行与路由参数</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField label="上下文窗口" type="number" value={draft.contextWindow} onChange={(event) => update('contextWindow', Number(event.target.value))} />
                <TextField label="最大输出" type="number" value={draft.maxOutputTokens} onChange={(event) => update('maxOutputTokens', Number(event.target.value))} />
                <TextField label="优先级" type="number" value={draft.priority} onChange={(event) => update('priority', Number(event.target.value))} helperText="数字越小越优先" />
                <TextField select label="成本层级" value={draft.costTier} onChange={(event) => update('costTier', event.target.value as DeploymentDraft['costTier'])} slotProps={{ select: { native: true } }}>
                  <option value="LOW">低成本</option>
                  <option value="MEDIUM">均衡</option>
                  <option value="HIGH">高性能</option>
                </TextField>
                <TextField
                  label="单次模型调用超时（毫秒）"
                  type="number"
                  value={draft.timeoutMs}
                  onChange={(event) => update('timeoutMs', Number(event.target.value))}
                  helperText="整条研究时限会按工作流阶段与重试预算自动计算"
                />
                <TextField
                  label="最大重试"
                  type="number"
                  value={draft.maxRetries}
                  onChange={(event) => update('maxRetries', Number(event.target.value))}
                  helperText="作用于每次模型请求"
                />
                <TextField label="重试基数（毫秒）" type="number" value={draft.retryBaseMs} onChange={(event) => update('retryBaseMs', Number(event.target.value))} />
              </Box>
            </AccordionDetails>
          </Accordion>

          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: probe ? 1 : 0, color: 'text.secondary' }}>
              深度探测会按当前默认推理策略、最大输出上限、结构化输出和工具能力执行一至两次最小调用；视觉输入仅保留声明，不在此伪判定。
            </Typography>
            {probe ? (
              <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Alert severity={probe.status === 'PASSED' ? 'success' : 'error'}>
                  深度探测 {probe.status === 'PASSED' ? '通过' : '失败'} · {probe.durationMs} ms
                </Alert>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {probe.steps.map((step, index) => {
                    const appearance = PROBE_STEP_APPEARANCE[step.status];
                    return (
                      <Stack
                        key={`${step.key}-${index}`}
                        direction="row"
                        spacing={1}
                        alignItems="flex-start"
                      >
                        <Iconify icon={appearance.icon} width={18} sx={{ mt: 0.25, color: appearance.color }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2">{PROBE_STEP_LABELS[step.key]}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            {step.message}
                          </Typography>
                        </Box>
                        <Chip size="small" variant="outlined" label={appearance.label} />
                      </Stack>
                    );
                  })}
                </Stack>
              </Box>
            ) : null}
          </Box>
        </Stack>
      </Box>
      <Divider />
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          取消
        </Button>
        <Button
          variant="outlined"
          loading={busy}
          onClick={() => void saveDraft()}
          disabled={busy}
        >
          {busy ? '正在保存…' : '保存草稿'}
        </Button>
        <Button variant="outlined" color="warning" onClick={() => void runProbe()} disabled={busy || !saved}>
          深度探测（可能计费）
        </Button>
        <Button
          variant="contained"
          onClick={() => void enableDeployment()}
          disabled={busy || probe?.status !== 'PASSED' || saved?.enabled}
        >
          {saved?.enabled ? '已启用' : '启用部署'}
        </Button>
      </Stack>
    </Drawer>
  );
}
