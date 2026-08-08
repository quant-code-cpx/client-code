import type {
  ModelConnection,
  ModelProbeResult,
  ModelAdapterDefinition,
  CreateModelConnectionPayload,
} from 'src/api/model-provider';

import { varAlpha } from 'minimal-shared/utils';
import { useRef, useMemo, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Stepper from '@mui/material/Stepper';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import {
  testModelConnection,
  createModelConnection,
  updateModelConnection,
} from 'src/api/model-provider';

import { Iconify } from 'src/components/iconify';

import { ADAPTER_LABELS } from '../model-provider.constants';
import {
  apiFieldErrors,
  hasFieldErrors,
  validateConnectionFields,
  type ModelProviderFieldErrors,
} from '../model-provider.validation';

type ConnectionDraft = CreateModelConnectionPayload;

const EMPTY_DRAFT: ConnectionDraft = {
  connectionKey: '',
  adapterKind: 'openai-responses',
  displayName: '',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  enabled: false,
};

export function ConnectionWizardDrawer({
  open,
  connection,
  adapters,
  onClose,
  onChanged,
}: {
  open: boolean;
  connection?: ModelConnection;
  adapters: ModelAdapterDefinition[];
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<ConnectionDraft>(EMPTY_DRAFT);
  const [saved, setSaved] = useState<ModelConnection | undefined>(connection);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ModelProviderFieldErrors>({});
  const [probe, setProbe] = useState<ModelProbeResult | null>(null);
  const baseUrlUserEditedRef = useRef(false);

  const selectedAdapter = useMemo(
    () => adapters.find((adapter) => adapter.kind === draft.adapterKind),
    [adapters, draft.adapterKind]
  );

  useEffect(() => {
    if (!open) return;
    const adapter = adapters.find((item) => item.kind === connection?.adapterKind) ?? adapters[0];
    baseUrlUserEditedRef.current = Boolean(connection);
    setDraft(
      connection
        ? {
            connectionKey: connection.connectionKey,
            adapterKind: connection.adapterKind,
            displayName: connection.displayName,
            baseUrl: connection.baseUrl,
            apiKey: '',
            enabled: connection.enabled,
          }
        : {
            ...EMPTY_DRAFT,
            ...(adapter
              ? { adapterKind: adapter.kind, baseUrl: adapter.defaultBaseUrl ?? '' }
              : {}),
          }
    );
    setSaved(connection);
    setStep(connection ? 1 : 0);
    setMessage('');
    setFieldErrors({});
    setProbe(null);
  }, [adapters, connection, open]);

  const update = <K extends keyof ConnectionDraft>(key: K, value: ConnectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '' }));
  };

  const chooseAdapter = (adapter: ModelAdapterDefinition) => {
    setDraft((current) => ({
      ...current,
      adapterKind: adapter.kind,
      baseUrl: baseUrlUserEditedRef.current
        ? current.baseUrl
        : (adapter.defaultBaseUrl ?? current.baseUrl),
    }));
    setStep(1);
  };

  const saveDraft = async () => {
    const errors = validateConnectionFields({
      ...draft,
      requireApiKey: !saved,
    });
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;
    setBusy(true);
    setMessage('');
    try {
      const result = saved
        ? await updateModelConnection({
            id: saved.id,
            version: saved.version,
            connectionKey: draft.connectionKey.trim(),
            adapterKind: draft.adapterKind,
            displayName: draft.displayName.trim(),
            baseUrl: draft.baseUrl.trim().replace(/\/$/, ''),
            ...(draft.apiKey.trim() ? { apiKey: draft.apiKey.trim() } : {}),
          })
        : await createModelConnection({
            ...draft,
            connectionKey: draft.connectionKey.trim(),
            displayName: draft.displayName.trim(),
            baseUrl: draft.baseUrl.trim().replace(/\/$/, ''),
            apiKey: draft.apiKey.trim(),
            enabled: false,
          });
      setSaved(result);
      setProbe(null);
      setDraft((current) => ({ ...current, apiKey: '' }));
      setStep(2);
      setMessage('连接草稿已保存。测试通过后才能启用。');
      await onChanged();
    } catch (error) {
      setFieldErrors((current) => ({ ...current, ...apiFieldErrors(error) }));
      setMessage(error instanceof Error ? error.message : '保存连接失败');
    } finally {
      setBusy(false);
    }
  };

  const runProbe = async () => {
    if (!saved) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await testModelConnection(saved.id);
      setProbe(result);
      setMessage(result.status === 'PASSED' ? '连接测试通过，可以启用。' : '连接测试失败，请按步骤修正配置。');
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '连接测试失败');
    } finally {
      setBusy(false);
    }
  };

  const enableConnection = async () => {
    if (!saved || probe?.status !== 'PASSED') return;
    setBusy(true);
    try {
      const result = await updateModelConnection({ id: saved.id, version: saved.version, enabled: true });
      setSaved(result);
      setMessage('连接已启用，可继续创建模型部署。');
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '启用连接失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={busy ? undefined : onClose}
      slotProps={{ paper: { sx: { width: { xs: '100%', sm: 640 }, maxWidth: '100%' } } }}
    >
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{connection ? '编辑接入点' : '接入供应商'}</Typography>
          <Typography variant="body2" color="text.secondary">
            协议、凭证和模型部署分离管理
          </Typography>
        </Box>
        <IconButton aria-label="关闭接入向导" onClick={onClose} disabled={busy}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>
      <Divider />
      <Stepper activeStep={step} sx={{ px: 3, py: 2 }}>
        {['选择协议', '连接配置', '测试与启用'].map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <Divider />
      <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
        {message ? (
          <Alert severity={probe?.status === 'FAILED' ? 'error' : 'info'} sx={{ mb: 2 }}>
            {message}
          </Alert>
        ) : null}

        {step === 0 ? (
          <Stack spacing={1.5}>
            {adapters.map((adapter) => {
              const selected = draft.adapterKind === adapter.kind;

              return (
                <Button
                  key={adapter.kind}
                  variant={selected ? 'contained' : 'outlined'}
                  color={selected ? 'primary' : 'inherit'}
                  onClick={() => chooseAdapter(adapter)}
                  sx={{ p: 2, justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2" color={selected ? 'primary.contrastText' : 'text.primary'}>
                        {adapter.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={selected ? 'primary.contrastText' : 'text.secondary'}
                        sx={{ opacity: selected ? 0.88 : 1 }}
                      >
                        {adapter.native ? '原生协议' : '兼容协议'}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="body2"
                      color={selected ? 'primary.contrastText' : 'text.secondary'}
                      sx={{ mt: 0.5, opacity: selected ? 0.88 : 1 }}
                    >
                      {adapter.summary}
                    </Typography>
                  </Box>
                </Button>
              );
            })}
          </Stack>
        ) : null}

        {step === 1 ? (
          <Stack spacing={2.25}>
            <Alert severity="info">
              显示名称支持中文；连接 Key 是稳定运维标识，只允许英文、数字、下划线和连字符。
            </Alert>
            <TextField
              label="显示名称"
              name="connectionDisplayName"
              value={draft.displayName}
              onChange={(event) => update('displayName', event.target.value)}
              error={Boolean(fieldErrors.displayName)}
              helperText={fieldErrors.displayName ?? '例如：主模型连接'}
              required
              autoFocus
              autoComplete="off"
            />
            <TextField
              label="连接 Key"
              name="connectionKey"
              value={draft.connectionKey}
              onChange={(event) => update('connectionKey', event.target.value)}
              error={Boolean(fieldErrors.connectionKey)}
              helperText={fieldErrors.connectionKey ?? '例如 primary-model-connection，不支持中文'}
              required
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              select
              label="协议适配器"
              value={draft.adapterKind}
              slotProps={{ select: { native: true } }}
              onChange={(event) => {
                const adapter = adapters.find((item) => item.kind === event.target.value);
                if (adapter) chooseAdapter(adapter);
              }}
            >
              {adapters.map((adapter) => (
                <option key={adapter.kind} value={adapter.kind}>
                  {adapter.label}
                </option>
              ))}
            </TextField>
            <TextField
              label="Base URL"
              name="baseUrl"
              type="url"
              value={draft.baseUrl}
              onChange={(event) => {
                baseUrlUserEditedRef.current = true;
                update('baseUrl', event.target.value);
              }}
              onBlur={() => update('baseUrl', draft.baseUrl.trim().replace(/\/$/, ''))}
              error={Boolean(fieldErrors.baseUrl)}
              helperText={fieldErrors.baseUrl ?? selectedAdapter?.summary}
              placeholder="https://api.example.com/v1…"
              required
              autoComplete="off"
              spellCheck={false}
            />
            <TextField
              label={saved ? '轮换 API key' : 'API key'}
              name="apiKey"
              type="password"
              value={draft.apiKey}
              onChange={(event) => update('apiKey', event.target.value)}
              error={Boolean(fieldErrors.apiKey)}
              helperText={
                fieldErrors.apiKey ??
                (saved ? `留空保持原凭证${saved.apiKeyLastFour ? `（••••${saved.apiKeyLastFour}）` : ''}` : '密钥只加密保存在服务端')
              }
              required={!saved}
              autoComplete="new-password"
            />
          </Stack>
        ) : null}

        {step === 2 ? (
          <Stack spacing={2}>
            <Box
              sx={(theme) => ({
                p: 2,
                borderRadius: 1.5,
                border: `1px solid ${theme.vars.palette.divider}`,
                bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.04),
              })}
            >
              <Typography variant="subtitle2">{saved?.displayName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {saved ? ADAPTER_LABELS[saved.adapterKind] : ''} · {saved?.baseUrl}
              </Typography>
            </Box>
            <Alert severity="warning">
              测试会检查 URL 安全策略、TLS、鉴权与模型目录，不会发送业务 Prompt。
            </Alert>
            {probe?.steps.map((item) => (
              <Stack key={item.key} direction="row" spacing={1.5} alignItems="flex-start">
                <Iconify
                  icon={item.status === 'PASSED' ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'}
                  color={item.status === 'PASSED' ? 'success.main' : 'error.main'}
                  width={22}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.key}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.message} · {item.durationMs} ms
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        ) : null}
      </Box>
      <Divider />
      <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ p: 2 }}>
        <Button disabled={busy || step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
          上一步
        </Button>
        <Stack direction="row" spacing={1}>
          {step === 1 ? (
            <Button
              variant="contained"
              startIcon={busy ? <CircularProgress size={18} aria-hidden="true" /> : undefined}
              onClick={() => void saveDraft()}
              disabled={busy}
            >
              {busy ? '正在保存…' : '保存草稿并继续'}
            </Button>
          ) : null}
          {step === 2 ? (
            <>
              <Button
                variant="outlined"
                startIcon={busy ? <CircularProgress size={18} aria-hidden="true" /> : undefined}
                onClick={() => void runProbe()}
                disabled={busy || !saved}
              >
                {busy ? '正在测试…' : '测试连接'}
              </Button>
              <Button
                variant="contained"
                onClick={() => void enableConnection()}
                disabled={busy || probe?.status !== 'PASSED' || saved?.enabled}
              >
                {saved?.enabled ? '已启用' : '启用连接'}
              </Button>
            </>
          ) : null}
        </Stack>
      </Stack>
    </Drawer>
  );
}
