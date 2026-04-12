import type { SignalType, SignalRule, EventTypeItem } from 'src/api/event-study';

import { useState, useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { createSignalRule, updateSignalRule } from 'src/api/event-study';

import { SIGNAL_TYPE_CONFIG } from './constants';
import { SignalRuleConditionForm } from './signal-rule-condition-form';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingRule: SignalRule | null;
  eventTypes: EventTypeItem[];
};

export function SignalRuleDialog({ open, onClose, onSaved, editingRule, eventTypes }: Props) {
  const isEdit = !!editingRule;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('');
  const [signalType, setSignalType] = useState<SignalType>('BUY');
  const [conditions, setConditions] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      if (editingRule) {
        setName(editingRule.name);
        setDescription(editingRule.description ?? '');
        setEventType(editingRule.eventType);
        setSignalType(editingRule.signalType);
        setConditions(editingRule.conditions ?? {});
      } else {
        setName('');
        setDescription('');
        setEventType('');
        setSignalType('BUY');
        setConditions({});
      }
      setError('');
    }
  }, [open, editingRule]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入规则名称');
      return;
    }
    if (!isEdit && !eventType) {
      setError('请选择事件类型');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (isEdit) {
        await updateSignalRule(editingRule.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          conditions,
          signalType,
        });
      } else {
        await createSignalRule({
          name: name.trim(),
          description: description.trim() || undefined,
          eventType: eventType as Parameters<typeof createSignalRule>[0]['eventType'],
          conditions,
          signalType,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? '编辑信号规则' : '创建信号规则'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            fullWidth
            label="规则名称 *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 128 }}
          />

          <TextField
            fullWidth
            label="描述"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <FormControl fullWidth disabled={isEdit}>
            <InputLabel>事件类型 *</InputLabel>
            <Select
              value={eventType}
              label="事件类型 *"
              onChange={(e) => setEventType(e.target.value)}
            >
              {eventTypes.map((et) => (
                <MenuItem key={et.type} value={et.type}>
                  {et.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              信号类型
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={signalType}
              onChange={(_, v: SignalType | null) => {
                if (v) setSignalType(v);
              }}
              size="small"
            >
              {(Object.keys(SIGNAL_TYPE_CONFIG) as SignalType[]).map((type) => (
                <ToggleButton key={type} value={type}>
                  {SIGNAL_TYPE_CONFIG[type].label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          <SignalRuleConditionForm value={conditions} onChange={setConditions} />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
