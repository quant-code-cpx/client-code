import type {
  EventType,
  SignalType,
  SignalRule,
  EventTypeItem,
  EventSchemaField,
  SignalRulePreviewResult,
} from 'src/api/event-study';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Step from '@mui/material/Step';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Select from '@mui/material/Select';
import Stepper from '@mui/material/Stepper';
import MenuItem from '@mui/material/MenuItem';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import {
  getEventSchema,
  createSignalRule,
  updateSignalRule,
  previewSignalRule,
} from 'src/api/event-study';

import { DataState } from './_shared/data-state';
import { SignalRuleConditionForm } from './signal-rule-condition-form';
import { SIGNAL_TYPE_CONFIG, SIGNAL_RULE_WIZARD_STEPS } from './constants';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingRule: SignalRule | null;
  eventTypes: EventTypeItem[];
};

export function SignalRuleWizardDialog({ open, onClose, onSaved, editingRule, eventTypes }: Props) {
  const isEdit = !!editingRule;

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType | ''>('');
  const [signalType, setSignalType] = useState<SignalType>('BUY');
  const [conditions, setConditions] = useState<Record<string, unknown>>({});

  const [schemaFields, setSchemaFields] = useState<EventSchemaField[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<SignalRulePreviewResult | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 重置 / 初始化
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError('');
    setPreview(null);
    if (editingRule) {
      setName(editingRule.name);
      setDescription(editingRule.description ?? '');
      setEventType(editingRule.eventType as EventType);
      setSignalType(editingRule.signalType);
      setConditions(editingRule.conditions ?? {});
    } else {
      setName('');
      setDescription('');
      setEventType('');
      setSignalType('BUY');
      setConditions({});
      setSchemaFields([]);
    }
  }, [open, editingRule]);

  // 切换 eventType 后取 schema
  useEffect(() => {
    if (!open || !eventType) {
      return undefined;
    }
    let cancelled = false;
    setSchemaLoading(true);
    getEventSchema(eventType)
      .then((s) => {
        if (!cancelled) setSchemaFields(s.fields);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载字段失败');
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, eventType]);

  const goNext = async () => {
    if (step === 0) {
      if (!name.trim()) {
        setError('请输入规则名称');
        return;
      }
      if (!eventType) {
        setError('请选择事件类型');
        return;
      }
      setError('');
      setStep(1);
      return;
    }
    if (step === 1) {
      if (Object.keys(conditions).length === 0) {
        setError('请至少添加一个条件');
        return;
      }
      setError('');
      setStep(2);
      // 自动加载预览
      setPreviewLoading(true);
      try {
        const data = await previewSignalRule({
          eventType: eventType as EventType,
          conditions,
          signalType,
        });
        setPreview(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : '预览失败');
      } finally {
        setPreviewLoading(false);
      }
      return;
    }
    if (step === 2) {
      setError('');
      setStep(3);
    }
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = async () => {
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
          eventType: eventType as EventType,
          conditions,
          signalType,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEdit ? '编辑信号规则' : '创建信号规则'}</DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ my: 2 }}>
          {SIGNAL_RULE_WIZARD_STEPS.map((s) => (
            <Step key={s}>
              <StepLabel>{s}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Step 0: 基本信息 */}
        {step === 0 && (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
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
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <FormControl fullWidth disabled={isEdit}>
              <InputLabel>事件类型 *</InputLabel>
              <Select
                value={eventType}
                label="事件类型 *"
                onChange={(e) => setEventType(e.target.value as EventType)}
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
          </Stack>
        )}

        {/* Step 1: 条件 */}
        {step === 1 && (
          <DataState loading={schemaLoading} skeletonHeight={200}>
            <SignalRuleConditionForm
              schemaFields={schemaFields}
              value={conditions}
              onChange={setConditions}
            />
          </DataState>
        )}

        {/* Step 2: 预览 */}
        {step === 2 && (
          <DataState loading={previewLoading} skeletonHeight={200}>
            {preview ? (
              <Stack spacing={2}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={3} flexWrap="wrap">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        命中事件
                      </Typography>
                      <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {preview.matchCount}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        分布
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.primary' }}>
                        {Object.entries(preview.distribution)
                          .map(([k, v]) => `${k}:${v}`)
                          .join(' · ') || '-'}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
                {preview.samples.length > 0 ? (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      命中样本（前 10）
                    </Typography>
                    {preview.samples.slice(0, 10).map((s) => (
                      <Typography
                        key={`${s.tsCode}-${s.eventDate}`}
                        variant="caption"
                        sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}
                      >
                        {s.tsCode} · {s.name ?? '-'} · {s.eventDate}
                      </Typography>
                    ))}
                  </Stack>
                ) : null}
                {preview.matchCount === 0 ? (
                  <Alert severity="warning">该条件未命中任何事件，建议放宽阈值后重试。</Alert>
                ) : null}
              </Stack>
            ) : null}
            <LinearProgress
              variant="determinate"
              value={preview && preview.matchCount > 0 ? 100 : 0}
              sx={{ mt: 1, display: 'none' }}
            />
          </DataState>
        )}

        {/* Step 3: 确认 */}
        {step === 3 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              请确认规则配置：
            </Typography>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Typography variant="body2">
                  <b>名称：</b>
                  {name}
                </Typography>
                {description ? (
                  <Typography variant="body2">
                    <b>描述：</b>
                    {description}
                  </Typography>
                ) : null}
                <Typography variant="body2">
                  <b>事件类型：</b>
                  {eventTypes.find((e) => e.type === eventType)?.label ?? eventType}
                </Typography>
                <Typography variant="body2">
                  <b>信号类型：</b>
                  {SIGNAL_TYPE_CONFIG[signalType].label}
                </Typography>
                <Typography variant="body2" component="div">
                  <b>条件：</b>
                  <Box
                    component="pre"
                    sx={{
                      m: 0,
                      mt: 0.5,
                      fontSize: 12,
                      bgcolor: 'background.neutral',
                      p: 1,
                      borderRadius: 1,
                    }}
                  >
                    {JSON.stringify(conditions, null, 2)}
                  </Box>
                </Typography>
              </Stack>
            </Card>
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        {step > 0 && (
          <Button onClick={goBack} disabled={submitting}>
            上一步
          </Button>
        )}
        {step < 3 ? (
          <Button variant="contained" onClick={goNext}>
            下一步
          </Button>
        ) : (
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中…' : '保存'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
