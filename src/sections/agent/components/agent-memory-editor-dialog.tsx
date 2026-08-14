import type { AgentRequest } from 'src/api/agent';

import { useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { agentApi } from 'src/api/agent';

import {
  type AgentMemory,
  CATEGORY_OPTIONS,
  formatMemoryJson,
  type MemoryCategory,
  type MemorySensitivity,
  getSelectableSensitivities,
} from './agent-memory-model';

type Props = {
  memory: AgentMemory | null;
  open: boolean;
  onClose: () => void;
  onSaved: (memory: AgentMemory) => void;
};

export function AgentMemoryEditorDialog({ memory, open, onClose, onSaved }: Props) {
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
    setValueJson(memory ? formatMemoryJson(memory.value) : '{\n  "style": "concise"\n}');
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

  const allowedSensitivities = getSelectableSensitivities(category);
  const valid = confirmed && key.trim().length >= 2 && valueJson.trim().length > 0;

  return (
    <Dialog
      open={open}
      onClose={!saving ? onClose : undefined}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            color: 'text.primary',
            bgcolor: 'background.paper',
            backgroundImage: 'none',
            overscrollBehavior: 'contain',
          },
        },
      }}
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
            if (!getSelectableSensitivities(nextCategory).some(([value]) => value === sensitivity)) {
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
        <Button color="inherit" disabled={saving} onClick={onClose}>
          取消
        </Button>
        <Button variant="contained" disabled={!valid} loading={saving} onClick={handleSave}>
          确认保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
