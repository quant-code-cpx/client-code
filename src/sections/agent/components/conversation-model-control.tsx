import type { AgentResponse } from 'src/api/agent';
import type { ModelPolicy } from 'src/types/agent/generated';

import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemText from '@mui/material/ListItemText';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ListItemButton from '@mui/material/ListItemButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { agentApi } from 'src/api/agent';

import { Iconify } from 'src/components/iconify';

type AgentModel = AgentResponse<'/agent/models/list'>['items'][number];

type ConversationModelControlProps = {
  policy: ModelPolicy;
  preferredModel: string | null;
  saving: boolean;
  onSave: (policy: ModelPolicy, preferredModel: string | null) => Promise<boolean>;
};

const COST_TIER_LABEL: Record<AgentModel['costTier'], string> = {
  LOW: '低费用',
  MEDIUM: '中费用',
  HIGH: '高费用',
};

export function ConversationModelControl({
  policy,
  preferredModel,
  saving,
  onSave,
}: ConversationModelControlProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<AgentModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftPolicy, setDraftPolicy] = useState<ModelPolicy>(policy);
  const [draftModel, setDraftModel] = useState(preferredModel ?? '');

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
      return undefined;
    }
    const controller = new AbortController();
    void loadModels(controller.signal);
    return () => controller.abort();
  }, [loadModels, open, policy, preferredModel]);

  const selectedModel = models.find((model) => model.model === draftModel);
  const manualValid = selectedModel?.status === 'AVAILABLE';
  const valid = draftPolicy === 'AUTO' || manualValid;
  const buttonLabel = policy === 'AUTO' ? '自动模型' : preferredModel ?? '指定模型';

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Iconify icon="solar:settings-bold-duotone" width={17} />}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
      </Button>
      <Dialog
        open={open}
        onClose={saving ? undefined : () => setOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: { sx: { overscrollBehavior: 'contain' } } }}
      >
        <DialogTitle>模型偏好</DialogTitle>
        <DialogContent>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={draftPolicy}
            onChange={(_event, value: ModelPolicy | null) => {
              if (value) setDraftPolicy(value);
            }}
            sx={{ mt: 1 }}
          >
            <ToggleButton value="AUTO">自动选择</ToggleButton>
            <ToggleButton value="MANUAL">指定模型</ToggleButton>
          </ToggleButtonGroup>

          {draftPolicy === 'MANUAL' ? (
            <Box sx={{ mt: 2 }}>
              {loading ? (
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  <Skeleton variant="rounded" height={68} />
                  <Skeleton variant="rounded" height={68} />
                </Box>
              ) : null}
              {!loading && loadError ? (
                <Alert
                  severity="error"
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
                <List disablePadding aria-label="可选模型">
                  {models.map((model) => (
                    <ListItemButton
                      key={model.model}
                      selected={draftModel === model.model}
                      disabled={model.status !== 'AVAILABLE'}
                      onClick={() => setDraftModel(model.model)}
                      sx={{
                        alignItems: 'flex-start',
                        borderBottom: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        px: 1,
                        py: 1.25,
                      }}
                    >
                      <Radio
                        checked={draftModel === model.model}
                        disabled={model.status !== 'AVAILABLE'}
                        inputProps={{ 'aria-label': `选择 ${model.displayName}` }}
                        sx={{ mt: -0.5, ml: -0.75, mr: 0.25 }}
                      />
                      <ListItemText
                        primary={model.displayName}
                        secondary={`${model.provider} · ${model.capabilities.join(' · ')}`}
                        slotProps={{
                          primary: { noWrap: true, sx: { fontWeight: 700 } },
                          secondary: { sx: { mt: 0.25, fontSize: 12, lineHeight: 1.45 } },
                        }}
                      />
                      <Box sx={{ display: 'grid', justifyItems: 'end', gap: 0.5, pl: 1 }}>
                        <Chip label={COST_TIER_LABEL[model.costTier]} size="small" variant="outlined" />
                        <Typography
                          variant="caption"
                          color={model.status === 'AVAILABLE' ? 'success.main' : 'text.disabled'}
                          sx={{ textAlign: 'right' }}
                        >
                          {model.status === 'AVAILABLE' ? '可用' : model.reason ?? '不可用'}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  ))}
                </List>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            variant="contained"
            disabled={!valid || loading || Boolean(loadError)}
            loading={saving}
            onClick={async () => {
              const saved = await onSave(draftPolicy, draftPolicy === 'MANUAL' ? draftModel : null);
              if (saved) setOpen(false);
            }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
