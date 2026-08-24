import type { MouseEvent } from 'react';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import ListItemText from '@mui/material/ListItemText';

import { Iconify } from 'src/components/iconify';

import type { AgentModel } from '../hooks/use-agent-model-catalog';

type ConversationModelControlProps = {
  preferredModel: string | null;
  reasoningEffort: string | null;
  models: AgentModel[];
  defaultModel: string | null;
  loading: boolean;
  loadError: string | null;
  saving: boolean;
  trigger?: 'button' | 'menu-item';
  onTrigger?: () => void;
  onReloadModels: () => void;
  onSave: (preferredModel: string, reasoningEffort: string | null) => Promise<boolean>;
};

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
  preferredModel,
  reasoningEffort,
  models,
  defaultModel,
  loading,
  loadError,
  saving,
  trigger = 'button',
  onTrigger,
  onReloadModels,
  onSave,
}: ConversationModelControlProps) {
  const [open, setOpen] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
  const [draftModel, setDraftModel] = useState(preferredModel ?? defaultModel ?? '');
  const [draftReasoningEffort, setDraftReasoningEffort] = useState<string | null>(reasoningEffort);

  useEffect(() => {
    if (!open) {
      setDraftModel(preferredModel ?? defaultModel ?? '');
      setDraftReasoningEffort(reasoningEffort);
    }
  }, [defaultModel, open, preferredModel, reasoningEffort]);

  useEffect(() => {
    if (open && !draftModel && defaultModel) setDraftModel(defaultModel);
  }, [defaultModel, draftModel, open]);

  const selectedModel = models.find((model) => model.model === draftModel);
  const configuredModel = models.find(
    (model) => model.model === (preferredModel ?? defaultModel)
  );
  const selectableReasoningEfforts = selectedModel?.capabilities.includes('REASONING_EFFORT')
    ? selectedModel.reasoningEfforts
    : [];
  const selectedEffort = findSupportedEffort(selectedModel, draftReasoningEffort);
  const valid = selectedModel?.status === 'AVAILABLE';
  const buttonLabel =
    configuredModel?.displayName ?? preferredModel ?? defaultModel ?? '选择模型';
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
            <Tooltip title="关闭模型设置">
              <span>
                <IconButton
                  size="small"
                  aria-label="关闭模型设置"
                  disabled={saving}
                  onClick={handleClose}
                >
                  <Iconify icon="mingcute:close-line" width={18} />
                </IconButton>
              </span>
            </Tooltip>
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
                <Button size="small" onClick={onReloadModels}>
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
                  value={draftModel}
                  onChange={(event) => {
                    const value = event.target.value;
                    const nextModel = models.find((model) => model.model === value);
                    setDraftModel(value);
                    setDraftReasoningEffort((current) => findSupportedEffort(nextModel, current));
                  }}
                  renderValue={(value) =>
                    models.find((model) => model.model === value)?.displayName ?? value
                  }
                >
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
                disabled={selectableReasoningEfforts.length === 0}
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
                {selectableReasoningEfforts.length
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
                const saved = await onSave(draftModel, selectedEffort);
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
