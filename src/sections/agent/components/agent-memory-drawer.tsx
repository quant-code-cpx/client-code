import type { AgentRequest, AgentResponse } from 'src/api/agent';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateTime } from 'src/utils/format-time';

import { agentApi } from 'src/api/agent';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ConfirmDialog } from 'src/components/confirm-dialog';

type AgentMemory = AgentResponse<'/agent/memories/list'>['items'][number];
type MemoryCategory = AgentMemory['category'];
type MemorySensitivity = AgentMemory['sensitivity'];

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  PREFERENCE: '回答偏好',
  PROFILE: '用户画像',
  CONSTRAINT: '研究约束',
  DOMAIN_FACT: '领域事实',
};

const SENSITIVITY_LABELS: Record<MemorySensitivity, string> = {
  NORMAL: '普通',
  PERSONAL: '个人',
  FINANCIAL: '金融敏感',
};

const STATUS_LABELS: Record<AgentMemory['status'], string> = {
  CANDIDATE: '待确认',
  CONFIRMED: '生效中',
  REVOKED: '已撤销',
  EXPIRED: '已过期',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [MemoryCategory, string][];
const SENSITIVITY_OPTIONS = Object.entries(SENSITIVITY_LABELS) as [MemorySensitivity, string][];

type AgentMemoryDrawerProps = {
  open: boolean;
  onClose: () => void;
};

type MemoryEditorDialogProps = {
  memory: AgentMemory | null;
  open: boolean;
  onClose: () => void;
  onSaved: (memory: AgentMemory) => void;
};

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function sourceLabel(memory: AgentMemory): string {
  if (memory.sourceMessageId) return '来自会话消息';
  if (memory.sourceConversationId) return '来自研究会话';
  return '由你手动保存';
}

function selectableSensitivities(category: MemoryCategory): [MemorySensitivity, string][] {
  if (category === 'PREFERENCE' || category === 'CONSTRAINT') return SENSITIVITY_OPTIONS;
  return SENSITIVITY_OPTIONS.filter(([value]) => value !== 'FINANCIAL');
}

function MemoryEditorDialog({ memory, open, onClose, onSaved }: MemoryEditorDialogProps) {
  const [category, setCategory] = useState<MemoryCategory>('PREFERENCE');
  const [key, setKey] = useState('');
  const [valueJson, setValueJson] = useState('{\n  "style": "concise"\n}');
  const [sensitivity, setSensitivity] = useState<MemorySensitivity>('NORMAL');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valueError, setValueError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategory(memory?.category ?? 'PREFERENCE');
    setKey(memory?.key ?? '');
    setValueJson(memory ? formatJson(memory.value) : '{\n  "style": "concise"\n}');
    setSensitivity(memory?.sensitivity ?? 'NORMAL');
    setConfirmed(false);
    setError(null);
    setValueError(null);
  }, [memory, open]);

  const handleSave = useCallback(async () => {
    if (!confirmed) return;

    let value: unknown;
    try {
      value = JSON.parse(valueJson);
    } catch {
      setValueError('请输入合法 JSON，例如 { "style": "concise" }。');
      return;
    }
    if (value === null) {
      setValueError('记忆内容不能为 null。');
      return;
    }

    setSaving(true);
    setError(null);
    setValueError(null);
    try {
      const shared = {
        value: value as AgentRequest<'/agent/memories/create'>['value'],
        sensitivity,
        topic: 'GENERAL' as const,
        confirmation: true as const,
      };
      const saved = memory
        ? await agentApi.updateMemory({ ...shared, memoryId: memory.memoryId })
        : await agentApi.createMemory({
            ...shared,
            category,
            key: key.trim(),
            sourceConversationId: null,
            sourceMessageId: null,
            confidence: 1,
            expiresAt: null,
          });
      onSaved(saved);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存长期记忆失败');
    } finally {
      setSaving(false);
    }
  }, [category, confirmed, key, memory, onClose, onSaved, sensitivity, valueJson]);

  const allowedSensitivities = selectableSensitivities(category);
  const valid = confirmed && key.trim().length >= 2 && valueJson.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={!saving ? onClose : undefined}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { overscrollBehavior: 'contain' } } }}
    >
      <DialogTitle>{memory ? '纠正长期记忆' : '保存长期记忆'}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          仅保存你明确确认、且希望 Agent 在后续研究中使用的信息。
        </Typography>

        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <TextField
          select
          fullWidth
          name="agent-memory-category"
          label="用途"
          value={category}
          disabled={Boolean(memory) || saving}
          onChange={(event) => {
            const nextCategory = event.target.value as MemoryCategory;
            setCategory(nextCategory);
            if (!selectableSensitivities(nextCategory).some(([value]) => value === sensitivity)) {
              setSensitivity('NORMAL');
            }
          }}
          slotProps={{ select: { native: true } }}
          sx={{ '& select': { bgcolor: 'background.paper', color: 'text.primary' } }}
        >
          {CATEGORY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </TextField>

        <TextField
          fullWidth
          name="agent-memory-key"
          label="记忆键"
          value={key}
          disabled={Boolean(memory) || saving}
          helperText={memory ? '纠正会保留同一记忆键，并创建新版本。' : '如 response.style、research.focus'}
          onChange={(event) => setKey(event.target.value)}
          slotProps={{ htmlInput: { autoComplete: 'off', maxLength: 128, spellCheck: false } }}
          sx={{ mt: 2 }}
        />

        <TextField
          select
          fullWidth
          name="agent-memory-sensitivity"
          label="敏感级别"
          value={sensitivity}
          disabled={saving}
          onChange={(event) => setSensitivity(event.target.value as MemorySensitivity)}
          slotProps={{ select: { native: true } }}
          sx={{ mt: 2, '& select': { bgcolor: 'background.paper', color: 'text.primary' } }}
        >
          {allowedSensitivities.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </TextField>

        <TextField
          multiline
          fullWidth
          minRows={8}
          name="agent-memory-value"
          label="记忆内容（JSON）"
          value={valueJson}
          disabled={saving}
          error={Boolean(valueError)}
          helperText={valueError ?? '支持对象、数组、字符串、数字或布尔值；不保存 null。'}
          onChange={(event) => {
            setValueJson(event.target.value);
            if (valueError) setValueError(null);
          }}
          slotProps={{ htmlInput: { autoComplete: 'off', spellCheck: false } }}
          sx={{ mt: 2, '& textarea': { fontFamily: 'monospace', fontSize: 13 } }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={confirmed}
              disabled={saving}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
          }
          label={memory ? '我确认以此内容纠正长期记忆' : '我确认将此内容保存为长期记忆'}
          sx={{ alignItems: 'flex-start', mt: 1.5 }}
        />
      </DialogContent>
      <DialogActions>
        <Button disabled={saving} onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" disabled={!valid} loading={saving} onClick={handleSave}>
          确认保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function AgentMemoryDrawer({ open, onClose }: AgentMemoryDrawerProps) {
  const [items, setItems] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorMemory, setEditorMemory] = useState<AgentMemory | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<AgentMemory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await agentApi.listMemories({ cursor: null, limit: 100, includeInactive: false });
      setItems(response.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载长期记忆失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  const handleSaved = useCallback((saved: AgentMemory) => {
    setItems((current) => {
      const index = current.findIndex((item) => item.memoryId === saved.memoryId);
      if (index < 0) return [saved, ...current];
      return current.map((item) => (item.memoryId === saved.memoryId ? saved : item));
    });
    setEditorMemory(undefined);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await agentApi.deleteMemory({ memoryId: deleteTarget.memoryId });
      setItems((current) => current.filter((item) => item.memoryId !== deleteTarget.memoryId));
      setDeleteTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '删除长期记忆失败');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  const editorOpen = editorMemory !== undefined;

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 1, sm: 480 },
              overflowX: 'hidden',
              overscrollBehavior: 'contain',
            },
          },
        }}
      >
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6">长期记忆</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              仅将明确确认的信息用于后续研究。
            </Typography>
          </Box>
          <Tooltip title="保存长期记忆">
            <IconButton aria-label="保存长期记忆" onClick={() => setEditorMemory(null)}>
              <Iconify icon="solar:add-circle-bold" width={21} />
            </IconButton>
          </Tooltip>
          <Tooltip title="关闭长期记忆">
            <IconButton aria-label="关闭长期记忆" onClick={onClose}>
              <Iconify icon="solar:close-circle-bold" width={21} />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider />

        {error ? (
          <Alert severity="error" action={<Button onClick={load}>重试</Button>} sx={{ borderRadius: 0 }}>
            {error}
          </Alert>
        ) : null}

        <Scrollbar sx={{ flex: 1 }}>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} variant="rounded" height={164} />
              ))
            ) : items.length === 0 ? (
              <Box sx={{ textAlign: 'center', px: 2, py: 8 }}>
                <Iconify icon="solar:notebook-bookmark-bold" width={40} sx={{ color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body2">还没有长期记忆</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  仅保存你希望 Agent 在未来研究中沿用的信息。
                </Typography>
              </Box>
            ) : (
              items.map((memory) => (
                <Box
                  key={memory.memoryId}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    contentVisibility: 'auto',
                    containIntrinsicSize: 'auto 208px',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="overline" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                        {CATEGORY_LABELS[memory.category]} · {STATUS_LABELS[memory.status]}
                      </Typography>
                      <Typography variant="subtitle2" noWrap>
                        {memory.key}
                      </Typography>
                    </Box>
                    <Chip size="small" label={SENSITIVITY_LABELS[memory.sensitivity]} variant="outlined" />
                  </Box>

                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      mt: 1,
                      p: 1,
                      maxHeight: 120,
                      overflow: 'auto',
                      borderRadius: 1,
                      bgcolor: 'action.hover',
                      color: 'text.secondary',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      fontFamily: 'monospace',
                      fontSize: 12,
                    }}
                  >
                    {formatJson(memory.value)}
                  </Box>

                  <Typography variant="caption" component="div" sx={{ color: 'text.secondary', mt: 1 }}>
                    {sourceLabel(memory)} · 更新于 {fDateTime(memory.updatedAt)}
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                    {memory.expiresAt ? `到期：${fDateTime(memory.expiresAt)}` : '按默认保留策略'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                    <Button size="small" onClick={() => setEditorMemory(memory)}>
                      纠正
                    </Button>
                    <Button size="small" color="error" onClick={() => setDeleteTarget(memory)}>
                      删除
                    </Button>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Scrollbar>
      </Drawer>

      <MemoryEditorDialog
        open={editorOpen}
        memory={editorMemory ?? null}
        onClose={() => setEditorMemory(undefined)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除长期记忆"
        content={`删除「${deleteTarget?.key ?? ''}」后，新的 Agent Run 将不再使用它。`}
        submitting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="删除"
      />
    </>
  );
}
