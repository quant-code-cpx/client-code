import type {
  ModelConnection,
  ModelDeployment,
  ModelProbeResult,
  ModelProviderDataClass,
  ModelAdapterDefinition,
  ModelProviderCapability,
  CreateModelDeploymentPayload,
} from 'src/api/model-provider';

import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import {
  probeModelDeployment,
  createModelDeployment,
  updateModelDeployment,
} from 'src/api/model-provider';

import { Iconify } from 'src/components/iconify';

import { EMPTY_DEPLOYMENT_DRAFT } from './deployment-editor-model';
import { DeploymentRoutingFields } from './deployment-routing-fields';
import { REASONING_EFFORT_PATTERN } from '../model-provider.constants';
import { DeploymentReasoningFields } from './deployment-reasoning-fields';
import { DeploymentProbeDiagnostics } from './deployment-probe-diagnostics';
import { DeploymentConnectionFields } from './deployment-connection-fields';
import {
  apiFieldErrors,
  hasFieldErrors,
  validateDeploymentFields,
  type ModelProviderFieldErrors,
} from '../model-provider.validation';

import type { DeploymentDraft } from './deployment-editor-model';

function sameValues(left: readonly string[], right: readonly string[]): boolean {
  return [...left].sort().join('\u0000') === [...right].sort().join('\u0000');
}

function draftMatchesDeployment(draft: DeploymentDraft, deployment?: ModelDeployment): boolean {
  if (!deployment || draft.customEffort.trim()) return false;
  return (
    draft.connectionId === deployment.connectionId &&
    draft.modelId.trim() === deployment.modelId &&
    draft.displayName.trim() === deployment.displayName &&
    draft.priority === deployment.priority &&
    draft.costTier === deployment.costTier &&
    draft.contextWindow === deployment.contextWindow &&
    draft.maxOutputTokens === deployment.maxOutputTokens &&
    sameValues(draft.capabilities, deployment.capabilities) &&
    draft.reasoningMode === deployment.reasoningMode &&
    sameValues(draft.reasoningEfforts, deployment.reasoningEfforts) &&
    (draft.defaultReasoningEffort || undefined) ===
      (deployment.defaultReasoningEffort ?? undefined) &&
    (draft.reasoningBudgetTokens ?? undefined) ===
      (deployment.reasoningBudgetTokens ?? undefined) &&
    sameValues(draft.dataClasses, deployment.dataClasses) &&
    draft.timeoutMs === deployment.timeoutMs &&
    draft.maxRetries === deployment.maxRetries &&
    draft.retryBaseMs === deployment.retryBaseMs
  );
}

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
  const [draft, setDraft] = useState<DeploymentDraft>(EMPTY_DEPLOYMENT_DRAFT);
  const [saved, setSaved] = useState<ModelDeployment | undefined>(deployment);
  const [fieldErrors, setFieldErrors] = useState<ModelProviderFieldErrors>({});
  const [message, setMessage] = useState('');
  const [messageSeverity, setMessageSeverity] = useState<'error' | 'info' | 'success'>('info');
  const [probe, setProbe] = useState<ModelProbeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const editorSessionRef = useRef<string | null>(null);

  const connection = useMemo(
    () => connections.find((item) => item.id === draft.connectionId),
    [connections, draft.connectionId]
  );
  const adapter = useMemo(
    () => adapters.find((item) => item.kind === connection?.adapterKind),
    [adapters, connection?.adapterKind]
  );

  useEffect(() => {
    if (!open) {
      editorSessionRef.current = null;
      return;
    }
    const sessionKey = deployment?.id ?? 'new';
    if (editorSessionRef.current === sessionKey) return;
    editorSessionRef.current = sessionKey;
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
            ...EMPTY_DEPLOYMENT_DRAFT,
            connectionId: initialConnection?.id ?? '',
            reasoningEfforts: initialAdapter?.builtInEfforts.length
              ? [...initialAdapter.builtInEfforts]
              : [...EMPTY_DEPLOYMENT_DRAFT.reasoningEfforts],
            capabilities: [...EMPTY_DEPLOYMENT_DRAFT.capabilities],
          }
    );
    setSaved(deployment);
    setFieldErrors({});
    setMessage('');
    setMessageSeverity('info');
    setProbe(null);
  }, [adapters, connections, deployment, open]);

  const isDirty = !draftMatchesDeployment(draft, saved);
  const connectionReady = Boolean(connection?.enabled && connection.lastProbe?.status === 'PASSED');
  const modelTestBlockedReason = !saved
    ? '请先保存部署草稿'
    : isDirty
      ? '请先保存当前修改，再测试已保存配置'
      : '';
  const enableBlockedReason = !saved
    ? '请先保存部署草稿'
    : isDirty
      ? '请先保存当前修改，再启用部署'
      : !connection?.enabled
        ? '请先启用供应商连接'
        : connection.lastProbe?.status !== 'PASSED'
          ? '请先完成并通过连接测试'
          : '';

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
    if (!draft.capabilities.includes('STREAMING')) {
      errors.capabilities = '流式输出是网关必需能力';
    }
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
      setMessageSeverity(result.enabled ? 'success' : 'info');
      setMessage(
        result.enabled
          ? '模型部署已保存并自动发布；后续新建运行将使用最新配置。'
          : '模型部署已保存为未启用草稿；启用后才会进入活动路由。'
      );
      await onChanged();
    } catch (error) {
      setFieldErrors((current) => ({ ...current, ...apiFieldErrors(error) }));
      setMessageSeverity('error');
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
      setMessageSeverity(result.status === 'PASSED' ? 'success' : 'error');
      setMessage(
        result.status === 'PASSED'
          ? '模型测试通过。'
          : `模型测试失败：${failedStep?.message ?? '请检查模型 ID 与能力配置。'}`
      );
      await onChanged();
    } catch (error) {
      setMessageSeverity('error');
      setMessage(error instanceof Error ? error.message : '模型测试失败');
    } finally {
      setBusy(false);
    }
  };

  const enableDeployment = async () => {
    if (!saved) return;
    setBusy(true);
    try {
      const result = await updateModelDeployment({
        id: saved.id,
        version: saved.version,
        enabled: true,
      });
      setSaved(result);
      setMessageSeverity('success');
      setMessage('模型部署已启用，并已同步到活动路由。');
      await onChanged();
    } catch (error) {
      setMessageSeverity('error');
      setMessage(error instanceof Error ? error.message : '启用模型部署失败');
    } finally {
      setBusy(false);
    }
  };

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
          {message ? (
            <Alert severity={messageSeverity}>{message}</Alert>
          ) : null}
          <DeploymentConnectionFields
            draft={draft}
            connection={connection}
            connections={connections}
            fieldErrors={fieldErrors}
            onUpdate={update}
            onChangeConnection={changeConnection}
            onToggleCapability={toggleCapability}
          />
          <DeploymentReasoningFields
            draft={draft}
            adapter={adapter}
            fieldErrors={fieldErrors}
            onUpdate={update}
            onAddCustomEffort={addCustomEffort}
            onToggleDataClass={toggleDataClass}
          />
          <DeploymentRoutingFields draft={draft} onUpdate={update} />
          <DeploymentProbeDiagnostics probe={probe} />
        </Stack>
      </Box>
      <Divider />
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          取消
        </Button>
        <Button variant="outlined" loading={busy} onClick={() => void saveDraft()} disabled={busy}>
          {busy ? '正在保存…' : saved?.enabled ? '保存并生效' : '保存草稿'}
        </Button>
        <Tooltip title={modelTestBlockedReason} disableHoverListener={!modelTestBlockedReason}>
          <span>
            <Button
              variant="outlined"
              color="warning"
              onClick={() => void runProbe()}
              disabled={busy || !saved || isDirty}
            >
              模型测试（可选，可能计费）
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={enableBlockedReason} disableHoverListener={!enableBlockedReason}>
          <span>
            <Button
              variant="contained"
              onClick={() => void enableDeployment()}
              disabled={busy || !saved || saved.enabled || isDirty || !connectionReady}
            >
              {saved?.enabled ? '已启用' : '启用部署'}
            </Button>
          </span>
        </Tooltip>
      </Stack>
    </Drawer>
  );
}
