import type {
  ModelProvider,
  ModelProviderKind,
  ModelProviderCostTier,
  ModelProviderDataClass,
  ModelProviderCapability,
  CreateModelProviderPayload,
  UpdateModelProviderPayload,
  ModelProviderReasoningEffort,
} from 'src/api/model-provider';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import TableRow from '@mui/material/TableRow';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { DashboardContent } from 'src/layouts/dashboard';
import {
  listModelProviders,
  createModelProvider,
  deleteModelProvider,
  updateModelProvider,
  reloadModelProviders,
} from 'src/api/model-provider';

import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/confirm-dialog';

const CAPABILITIES: Array<{ value: ModelProviderCapability; label: string }> = [
  { value: 'STREAMING', label: '流式输出' },
  { value: 'STRUCTURED_OUTPUT', label: '结构化输出' },
  { value: 'TOOL_CALLING', label: '工具调用' },
  { value: 'PARALLEL_TOOL_CALLING', label: '并行工具' },
  { value: 'VISION', label: '视觉' },
  { value: 'REASONING_EFFORT', label: '推理强度' },
];

const REASONING_EFFORTS: Array<{ value: ModelProviderReasoningEffort; label: string }> = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
];

const DATA_CLASSES: Array<{ value: ModelProviderDataClass; label: string }> = [
  { value: 'PUBLIC', label: '公开数据' },
  { value: 'USER_PRIVATE', label: '用户私有' },
  { value: 'PORTFOLIO_SENSITIVE', label: '组合敏感' },
];

const COST_TIER_LABEL: Record<ModelProviderCostTier, string> = {
  LOW: '低成本',
  MEDIUM: '均衡',
  HIGH: '高性能',
};

const KIND_LABEL: Record<ModelProviderKind, string> = {
  'openai-compatible': 'OpenAI 兼容',
};

type FormState = {
  providerId: string;
  kind: ModelProviderKind;
  displayName: string;
  model: string;
  priority: number;
  costTier: ModelProviderCostTier;
  baseUrl: string;
  apiKey: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelProviderCapability[];
  reasoningEfforts: ModelProviderReasoningEffort[];
  dataClasses: ModelProviderDataClass[];
  timeoutMs: number;
  maxRetries: number;
  retryBaseMs: number;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  providerId: '',
  kind: 'openai-compatible',
  displayName: '',
  model: '',
  priority: 10,
  costTier: 'MEDIUM',
  baseUrl: '',
  apiKey: '',
  contextWindow: 128000,
  maxOutputTokens: 8192,
  capabilities: ['STREAMING', 'STRUCTURED_OUTPUT', 'TOOL_CALLING'],
  reasoningEfforts: ['MEDIUM'],
  dataClasses: ['PUBLIC', 'USER_PRIVATE'],
  timeoutMs: 120000,
  maxRetries: 2,
  retryBaseMs: 200,
  enabled: true,
};

function toForm(provider?: ModelProvider): FormState {
  if (!provider) return { ...EMPTY_FORM };
  return {
    providerId: provider.providerId,
    kind: provider.kind,
    displayName: provider.displayName,
    model: provider.model,
    priority: provider.priority,
    costTier: provider.costTier,
    baseUrl: provider.baseUrl ?? '',
    apiKey: '',
    contextWindow: provider.contextWindow,
    maxOutputTokens: provider.maxOutputTokens,
    capabilities: [...provider.capabilities],
    reasoningEfforts: [...provider.reasoningEfforts],
    dataClasses: [...provider.dataClasses],
    timeoutMs: provider.timeoutMs,
    maxRetries: provider.maxRetries,
    retryBaseMs: provider.retryBaseMs,
    enabled: provider.enabled,
  };
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function StatTile({ label, value, note, accent }: { label: string; value: string; note: string; accent: string }) {
  return (
    <Box
      sx={(theme) => ({
        position: 'relative',
        overflow: 'hidden',
        minHeight: 110,
        px: 2.5,
        py: 2,
        border: `1px solid ${theme.vars.palette.divider}`,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        '&::after': {
          content: '""',
          position: 'absolute',
          right: -20,
          bottom: -34,
          width: 110,
          height: 110,
          borderRadius: '50%',
          border: `18px solid ${accent}`,
          opacity: 0.12,
        },
      })}
    >
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.5, fontWeight: 800, letterSpacing: -0.5 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {note}
      </Typography>
    </Box>
  );
}

function ProviderEditorDialog({
  open,
  provider,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  provider?: ModelProvider;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: CreateModelProviderPayload | UpdateModelProviderPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(provider));
  const [error, setError] = useState('');
  const isEditing = Boolean(provider);

  useEffect(() => {
    if (open) {
      setForm(toForm(provider));
      setError('');
    }
  }, [open, provider]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggle = <K extends 'capabilities' | 'reasoningEfforts' | 'dataClasses'>(
    key: K,
    value: FormState[K][number]
  ) => {
    const current = form[key] as Array<typeof value>;
    update(key, (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]) as FormState[K]);
  };

  const submit = async () => {
    if (!form.providerId.trim() || !form.displayName.trim() || !form.model.trim()) {
      setError('请填写标识、显示名称和模型名称');
      return;
    }
    if (form.kind === 'openai-compatible' && !isEditing && !form.apiKey.trim()) {
      setError('OpenAI 兼容供应商首次配置必须填写 API key');
      return;
    }
    if (form.kind === 'openai-compatible' && !form.baseUrl.trim()) {
      setError('OpenAI 兼容供应商必须填写 Base URL');
      return;
    }
    if (!form.capabilities.length || !form.dataClasses.length) {
      setError('至少选择一项能力和数据范围');
      return;
    }
    const payload = {
      ...form,
      ...(isEditing && provider ? { id: provider.id } : {}),
      providerId: form.providerId.trim(),
      displayName: form.displayName.trim(),
      model: form.model.trim(),
      baseUrl: form.baseUrl.trim(),
      ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
    };
    try {
      await onSave(payload);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败');
    }
  };

  return (
    <Dialog open={open} onClose={!saving ? onClose : undefined} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 1 }}>{isEditing ? '编辑模型供应商' : '接入新供应商'}</DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
        <Stack spacing={2.5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField label="供应商标识" value={form.providerId} required onChange={(event) => update('providerId', event.target.value)} helperText="同一供应商可重复配置多个模型" />
            <TextField label="显示名称" value={form.displayName} required onChange={(event) => update('displayName', event.target.value)} />
            <TextField select label="接入类型" value={form.kind} onChange={(event) => update('kind', event.target.value as ModelProviderKind)}>
              {(Object.keys(KIND_LABEL) as ModelProviderKind[]).map((kind) => <MenuItem key={kind} value={kind}>{KIND_LABEL[kind]}</MenuItem>)}
            </TextField>
            <TextField label="模型名称" value={form.model} required onChange={(event) => update('model', event.target.value)} />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
            <TextField label="Base URL" value={form.baseUrl} placeholder="https://api.example.com/v1" onChange={(event) => update('baseUrl', event.target.value)} />
            <TextField label="优先级" type="number" value={form.priority} inputProps={{ min: 0, max: 1000 }} onChange={(event) => update('priority', Number(event.target.value))} />
            <TextField label={isEditing ? 'API key（留空保持不变）' : 'API key'} type="password" value={form.apiKey} required={!isEditing && form.kind === 'openai-compatible'} autoComplete="new-password" onChange={(event) => update('apiKey', event.target.value)} />
            <TextField select label="成本层级" value={form.costTier} onChange={(event) => update('costTier', event.target.value as ModelProviderCostTier)}>
              {(Object.keys(COST_TIER_LABEL) as ModelProviderCostTier[]).map((tier) => <MenuItem key={tier} value={tier}>{COST_TIER_LABEL[tier]}</MenuItem>)}
            </TextField>
          </Box>

          <Divider />
          <Typography variant="subtitle2">能力与数据边界</Typography>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">能力</Typography>
              <FormGroup row>
                {CAPABILITIES.map((item) => <FormControlLabel key={item.value} control={<Checkbox size="small" checked={form.capabilities.includes(item.value)} onChange={() => toggle('capabilities', item.value)} />} label={item.label} />)}
              </FormGroup>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">推理强度</Typography>
              <FormGroup row>
                {REASONING_EFFORTS.map((item) => <FormControlLabel key={item.value} control={<Checkbox size="small" checked={form.reasoningEfforts.includes(item.value)} onChange={() => toggle('reasoningEfforts', item.value)} />} label={item.label} />)}
              </FormGroup>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">允许处理的数据</Typography>
              <FormGroup row>
                {DATA_CLASSES.map((item) => <FormControlLabel key={item.value} control={<Checkbox size="small" checked={form.dataClasses.includes(item.value)} onChange={() => toggle('dataClasses', item.value)} />} label={item.label} />)}
              </FormGroup>
            </Box>
          </Box>

          <Divider />
          <Typography variant="subtitle2">运行参数</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
            <TextField label="上下文窗口" type="number" value={form.contextWindow} onChange={(event) => update('contextWindow', Number(event.target.value))} />
            <TextField label="最大输出" type="number" value={form.maxOutputTokens} onChange={(event) => update('maxOutputTokens', Number(event.target.value))} />
            <TextField label="超时（毫秒）" type="number" value={form.timeoutMs} onChange={(event) => update('timeoutMs', Number(event.target.value))} />
            <TextField label="最大重试" type="number" value={form.maxRetries} inputProps={{ min: 0, max: 2 }} onChange={(event) => update('maxRetries', Number(event.target.value))} />
          </Box>
          <FormControlLabel control={<Switch checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} />} label="立即启用此供应商" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="contained" onClick={() => void submit()} loading={saving}>保存配置</Button>
      </DialogActions>
    </Dialog>
  );
}

export function ModelProvidersView({ unauthorized = false }: { unauthorized?: boolean }) {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [loading, setLoading] = useState(!unauthorized);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<ModelProvider | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<ModelProvider | undefined>();
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [reloading, setReloading] = useState(false);

  const fetchProviders = useCallback(async () => {
    if (unauthorized) return;
    setLoading(true);
    setError('');
    try {
      const result = await listModelProviders();
      setProviders(result.items ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '加载供应商失败');
    } finally {
      setLoading(false);
    }
  }, [unauthorized]);

  useEffect(() => { void fetchProviders(); }, [fetchProviders]);

  const enabledCount = useMemo(() => providers.filter((provider) => provider.enabled).length, [providers]);
  const configuredCount = useMemo(() => providers.filter((provider) => provider.apiKeyConfigured).length, [providers]);

  const saveProvider = async (payload: CreateModelProviderPayload | UpdateModelProviderPayload) => {
    setSaving(true);
    try {
      if (editing) {
        const result = await updateModelProvider(payload as UpdateModelProviderPayload);
        setProviders((items) => items.map((item) => item.id === result.id ? result : item));
        setNotice('供应商配置已更新');
      } else {
        const result = await createModelProvider(payload as CreateModelProviderPayload);
        setProviders((items) => [...items, result].sort((a, b) => a.priority - b.priority));
        setNotice('供应商已接入');
      }
      setEditorOpen(false);
      setEditing(undefined);
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = async (provider: ModelProvider) => {
    try {
      const result = await updateModelProvider({ id: provider.id, enabled: !provider.enabled });
      setProviders((items) => items.map((item) => item.id === result.id ? result : item));
      setNotice(`${provider.displayName} 已${result.enabled ? '启用' : '停用'}`);
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : '状态更新失败');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await deleteModelProvider(deleting.id);
      setProviders((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(undefined);
      setNotice('供应商已删除');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败');
    } finally {
      setDeletingBusy(false);
    }
  };

  const handleReload = async () => {
    setReloading(true);
    try {
      await reloadModelProviders();
      await fetchProviders();
      setNotice('模型网关已重新加载');
    } catch (reloadError) {
      setError(reloadError instanceof Error ? reloadError.message : '重载失败');
    } finally {
      setReloading(false);
    }
  };

  if (unauthorized) {
    return (
      <DashboardContent maxWidth="md">
        <Alert severity="warning" icon={<Iconify icon="solar:shield-warning-bold" />}>模型供应商配置仅对超级管理员开放。</Alert>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent maxWidth="xl">
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 4 }}>
        <Box>
          <Typography variant="overline" color="primary.main" sx={{ fontWeight: 800, letterSpacing: 1.4 }}>AI CONTROL PLANE</Typography>
          <Typography variant="h3" sx={{ mt: 0.5, fontWeight: 800, letterSpacing: -1 }}>模型供应商</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.75, maxWidth: 640 }}>统一管理 Agent 模型接入、优先级与数据边界。保存后立即同步到模型网关。</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="重新读取数据库配置并刷新网关">
            <span><Button variant="outlined" color="inherit" startIcon={<Iconify icon="solar:refresh-bold" />} onClick={() => void handleReload()} loading={reloading}>重载网关</Button></span>
          </Tooltip>
          <Button variant="contained" startIcon={<Iconify icon="solar:add-circle-bold" />} onClick={() => { setEditing(undefined); setEditorOpen(true); }}>接入供应商</Button>
        </Stack>
      </Stack>

      {(error || notice) && <Alert severity={error ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => { setError(''); setNotice(''); }}>{error || notice}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2, mb: 3 }}>
        <StatTile label="已接入供应商" value={String(providers.length)} note="数据库配置总数" accent="#4f7cff" />
        <StatTile label="正在服务" value={String(enabledCount)} note="启用中的路由节点" accent="#16a085" />
        <StatTile label="密钥状态正常" value={String(configuredCount)} note="已配置真实供应商凭证" accent="#e07a35" />
      </Box>

      <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 1.5 }}>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>路由节点</Typography>
            <Typography variant="caption" color="text.secondary">按优先级升序选择，数字越小越优先</Typography>
          </Box>
          <Chip size="small" variant="outlined" label={`${enabledCount} 个在线`} color={enabledCount ? 'success' : 'default'} />
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 900 }}>
            <TableHead><TableRow>{['供应商', '模型与类型', '优先级', '能力', '凭证', '状态', '更新时间', ''].map((label) => <TableCell key={label} align={label === '优先级' ? 'center' : 'left'} sx={{ whiteSpace: 'nowrap' }}>{label}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {loading && Array.from({ length: 3 }).map((_, index) => <TableRow key={`skeleton-${index}`}>{Array.from({ length: 8 }).map((__, cell) => <TableCell key={cell}><Skeleton /></TableCell>)}</TableRow>)}
              {!loading && !providers.length && <TableRow><TableCell colSpan={8}><Box sx={{ py: 8, textAlign: 'center' }}><Iconify icon="solar:widget-bold" width={42} color="text.disabled" /><Typography sx={{ mt: 1, fontWeight: 700 }}>还没有模型供应商</Typography><Typography variant="body2" color="text.secondary">接入第一个供应商后，Agent 才能开始路由模型请求。</Typography></Box></TableCell></TableRow>}
              {!loading && providers.map((provider) => (
                <TableRow key={provider.id} hover sx={{ opacity: provider.enabled ? 1 : 0.58 }}>
                  <TableCell sx={{ minWidth: 170, whiteSpace: 'nowrap' }}><Stack direction="row" alignItems="center" spacing={1.25}><Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: provider.enabled ? 'success.main' : 'text.disabled' }} /><Box><Typography variant="body2" sx={{ fontWeight: 800 }}>{provider.displayName}</Typography><Typography variant="caption" color="text.secondary">{provider.providerId}</Typography></Box></Stack></TableCell>
                  <TableCell sx={{ minWidth: 150 }}><Typography variant="body2" sx={{ fontWeight: 700 }}>{provider.model}</Typography><Typography variant="caption" color="text.secondary">{KIND_LABEL[provider.kind]} · {COST_TIER_LABEL[provider.costTier]}</Typography></TableCell>
                  <TableCell align="center"><Chip label={provider.priority} size="small" sx={{ minWidth: 38, fontWeight: 800 }} /></TableCell>
                  <TableCell><Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ maxWidth: 220 }}>{provider.capabilities.slice(0, 3).map((capability) => <Chip key={capability} label={capability.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ fontSize: 10 }} />)}{provider.capabilities.length > 3 && <Chip label={`+${provider.capabilities.length - 3}`} size="small" variant="outlined" />}</Stack></TableCell>
                  <TableCell><Stack direction="row" spacing={0.5} alignItems="center"><Iconify icon={provider.apiKeyConfigured ? 'solar:check-circle-bold' : 'solar:danger-triangle-bold'} color={provider.apiKeyConfigured ? 'success.main' : 'warning.main'} width={18} /><Typography variant="caption">{provider.apiKeyConfigured ? `••••${provider.apiKeyLastFour ?? ''}` : '未配置'}</Typography></Stack></TableCell>
                  <TableCell><Switch size="small" checked={provider.enabled} onChange={() => void toggleProvider(provider)} inputProps={{ 'aria-label': `${provider.displayName} 启用状态` }} /></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{formatUpdatedAt(provider.updatedAt)}</Typography></TableCell>
                  <TableCell align="right"><Stack direction="row" justifyContent="flex-end"><Tooltip title="编辑"><IconButton size="small" onClick={() => { setEditing(provider); setEditorOpen(true); }}><Iconify icon="solar:pen-bold" width={18} /></IconButton></Tooltip><Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setDeleting(provider)}><Iconify icon="solar:trash-bin-trash-bold" width={18} /></IconButton></Tooltip></Stack></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ProviderEditorDialog open={editorOpen} provider={editing} saving={saving} onClose={() => { setEditorOpen(false); setEditing(undefined); }} onSave={saveProvider} />
      <ConfirmDialog open={Boolean(deleting)} title="删除模型供应商" content={<>确定删除 <strong>{deleting?.displayName}</strong>？已删除节点不会再参与模型路由。</>} onClose={() => setDeleting(undefined)} onConfirm={() => void confirmDelete()} submitting={deletingBusy} />
    </DashboardContent>
  );
}
