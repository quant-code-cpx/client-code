import type { MouseEvent } from 'react';
import type { AgentResponse } from 'src/api/agent';
import type { ModelPolicy } from 'src/types/agent/generated';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';

import { agentApi } from 'src/api/agent';

import { Iconify } from 'src/components/iconify';

type AgentModel = AgentResponse<'/agent/models/list'>['items'][number];

type ConversationModelControlProps = {
  policy: ModelPolicy;
  preferredModel: string | null;
  reasoningEffort: string | null;
  saving: boolean;
  trigger?: 'button' | 'menu-item';
  onTrigger?: () => void;
  onSave: (
    policy: ModelPolicy,
    preferredModel: string | null,
    reasoningEffort: string | null
  ) => Promise<boolean>;
};

const AUTO_MODEL_VALUE = '__AUTO_MODEL__';
const FOLLOW_MODEL_VALUE = '__FOLLOW_MODEL__';

const REASONING_EFFORT_LABELS: Record<string, string> = {
  NONE: '关闭',
  MINIMAL: '最低',
  LOW: '较低',
  MEDIUM: '标准',
  HIGH: '高',
  XHIGH: '极高',
  MAX: '最大',
};

export function formatReasoningEffort(effort: string): string {
  return REASONING_EFFORT_LABELS[effort.trim().toUpperCase()] ?? effort;
}

function findSupportedEffort(model: AgentModel | undefined, effort: string | null): string | null {
  if (!model?.capabilities.includes('REASONING_EFFORT') || !effort) return null;
  const normalized = effort.trim().toLowerCase();
  return model.reasoningEfforts.find((item) => item.trim().toLowerCase() === normalized) ?? null;
}

export function ConversationModelControl({
  policy,
  preferredModel,
  reasoningEffort,
  saving,
  trigger = 'button',
  onTrigger,
  onSave,
}: ConversationModelControlProps) {
  const [open, setOpen] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
  const [models, setModels] = useState<AgentModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftPolicy, setDraftPolicy] = useState<ModelPolicy>(policy);
  const [draftModel, setDraftModel] = useState(preferredModel ?? '');
  const [draftReasoningEffort, setDraftReasoningEffort] = useState<string | null>(reasoningEffort);

  const loadModels = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await agentApi.listModels(signal);
      if (!signal.aborted) setModels(response.items);
    } catch (error) {
      if (!signal.aborted) {
        setLoadError(error instanceof Error ? error.message : '模型目录加载失败');
      }
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setDraftPolicy(policy);
      setDraftModel(preferredModel ?? '');
      setDraftReasoningEffort(reasoningEffort);
      return undefined;
    }
    const controller = new AbortController();
    void loadModels(controller.signal);
    return () => controller.abort();
  }, [loadModels, open, policy, preferredModel, reasoningEffort]);

  const selectedModel = models.find((model) => model.model === draftModel);
  const selectableReasoningEfforts = selectedModel?.capabilities.includes('REASONING_EFFORT')
    ? selectedModel.reasoningEfforts
    : [];
  const selectedEffort = findSupportedEffort(selectedModel, draftReasoningEffort);
  const manualValid = selectedModel?.status === 'AVAILABLE';
  const valid = draftPolicy === 'AUTO' ? draftReasoningEffort === null : manualValid;
  const buttonLabel = policy === 'AUTO' ? '自动模型' : preferredModel ?? '指定模型';
  const triggerLabel = reasoningEffort
    ? `${buttonLabel} · ${formatReasoningEffort(reasoningEffort)}`
    : buttonLabel;

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setAnchorPosition({ top: rect.bottom + 8, left: rect.right });
    setOpen(true);
    onTrigger?.();
  };

  const handleClose = () => {
    if (!saving) setOpen(false);
  };

  return (
    <>
      {trigger === 'menu-item' ? (
        <MenuItem onClick={handleOpen} sx={{ minWidth: 196, gap: 1 }}>
          <Iconify icon="solar:settings-bold-duotone" width={18} />
          模型 · {triggerLabel}
        </MenuItem>
      ) : (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="solar:settings-bold-duotone" width={17} />}
          onClick={handleOpen}
          sx={{ borderRadius: 1, bgcolor: 'action.hover' }}
        >
          {triggerLabel}
        </Button>
      )}

      <Popover
        open={open && anchorPosition !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={anchorPosition ?? undefined}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxWidth: 'calc(100vw - 32px)',
              color: 'text.primary',
              bgcolor: 'background.paper',
              backgroundImage: 'none',
              overscrollBehavior: 'contain',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                模型与思考强度
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                只影响后续消息，当前运行不会中断。
              </Typography>
            </Box>
            <IconButton size="small" aria-label="关闭模型设置" disabled={saving} onClick={handleClose}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </Stack>

          {loading ? (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
            </Stack>
          ) : null}

          {!loading && loadError ? (
            <Alert
              severity="error"
              sx={{ mt: 2 }}
              action={
                <Button size="small" onClick={() => void loadModels(new AbortController().signal)}>
                  重试
                </Button>
              }
            >
              {loadError}
            </Alert>
          ) : null}

          {!loading && !loadError ? (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="conversation-model-label">模型</InputLabel>
                <Select
                  labelId="conversation-model-label"
                  label="模型"
                  value={draftPolicy === 'AUTO' ? AUTO_MODEL_VALUE : draftModel}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === AUTO_MODEL_VALUE) {
                      setDraftPolicy('AUTO');
                      setDraftModel('');
                      setDraftReasoningEffort(null);
                      return;
                    }
                    const nextModel = models.find((model) => model.model === value);
                    setDraftPolicy('MANUAL');
                    setDraftModel(value);
                    setDraftReasoningEffort((current) => findSupportedEffort(nextModel, current));
                  }}
                  renderValue={(value) =>
                    value === AUTO_MODEL_VALUE
                      ? '自动选择'
                      : (models.find((model) => model.model === value)?.displayName ?? value)
                  }
                >
                  <MenuItem value={AUTO_MODEL_VALUE}>自动选择</MenuItem>
                  {models.map((model) => (
                    <MenuItem
                      key={model.model}
                      value={model.model}
                      disabled={model.status !== 'AVAILABLE'}
                    >
                      <ListItemText
                        primary={model.displayName}
                        secondary={model.status === 'AVAILABLE' ? model.provider : model.reason ?? '不可用'}
                        slotProps={{ secondary: { sx: { fontSize: 12 } } }}
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                size="small"
                disabled={draftPolicy === 'AUTO' || selectableReasoningEfforts.length === 0}
              >
                <InputLabel id="conversation-reasoning-effort-label">思考强度</InputLabel>
                <Select
                  labelId="conversation-reasoning-effort-label"
                  label="思考强度"
                  value={selectedEffort ?? FOLLOW_MODEL_VALUE}
                  onChange={(event) => {
                    setDraftReasoningEffort(
                      event.target.value === FOLLOW_MODEL_VALUE ? null : event.target.value
                    );
                  }}
                >
                  <MenuItem value={FOLLOW_MODEL_VALUE}>
                    {selectedModel?.defaultReasoningEffort
                      ? `跟随模型（默认：${formatReasoningEffort(selectedModel.defaultReasoningEffort)}）`
                      : '跟随模型'}
                  </MenuItem>
                  {selectableReasoningEfforts.map((effort) => (
                    <MenuItem key={effort} value={effort}>
                      {formatReasoningEffort(effort)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {draftPolicy === 'AUTO'
                  ? '自动选择时使用各模型默认强度。'
                  : selectableReasoningEfforts.length
                    ? '强度越高通常耗时与用量越多；“跟随模型”使用部署默认值。'
                    : '该模型不支持调整思考强度，将使用模型默认设置。'}
              </Typography>
            </Stack>
          ) : null}

          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={1}
            sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}
          >
            <Button color="inherit" disabled={saving} onClick={handleClose}>
              取消
            </Button>
            <Button
              variant="contained"
              disabled={!valid || loading || Boolean(loadError)}
              loading={saving}
              onClick={async () => {
                const nextPreferredModel = draftPolicy === 'MANUAL' ? draftModel : null;
                const nextReasoningEffort = draftPolicy === 'MANUAL' ? selectedEffort : null;
                const saved = await onSave(draftPolicy, nextPreferredModel, nextReasoningEffort);
                if (saved) setOpen(false);
              }}
            >
              保存
            </Button>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
