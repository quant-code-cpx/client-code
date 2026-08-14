import type {
  ModelConnection,
  ModelDeployment,
  ModelProbeResult,
  ModelProviderDataClass,
  ModelAdapterDefinition,
  ModelProviderCapability,
  CreateModelDeploymentPayload,
} from 'src/api/model-provider';

import { useMemo, useState, useEffect } from 'react';

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
      setMessage(
        '模型部署已保存；当前启用状态与已有探测记录保持不变。可按需执行深度探测；后续调用失败会返回具体原因。'
      );
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
      const result = await updateModelDeployment({
        id: saved.id,
        version: saved.version,
        enabled: true,
      });
      setSaved(result);
      setMessage('模型部署已启用，并已同步到活动路由。');
      await onChanged();
    } catch (error) {
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
            <Alert severity={probe?.status === 'FAILED' ? 'error' : 'info'}>{message}</Alert>
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
          {busy ? '正在保存…' : '保存草稿'}
        </Button>
        <Button
          variant="outlined"
          color="warning"
          onClick={() => void runProbe()}
          disabled={busy || !saved}
        >
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
