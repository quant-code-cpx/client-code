import type { ModelPolicy } from 'src/types/agent/generated';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import ToggleButton from '@mui/material/ToggleButton';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

type ConversationModelControlProps = {
  policy: ModelPolicy;
  preferredModel: string | null;
  saving: boolean;
  onSave: (policy: ModelPolicy, preferredModel: string | null) => Promise<boolean>;
};

export function ConversationModelControl({
  policy,
  preferredModel,
  saving,
  onSave,
}: ConversationModelControlProps) {
  const [open, setOpen] = useState(false);
  const [draftPolicy, setDraftPolicy] = useState<ModelPolicy>(policy);
  const [draftModel, setDraftModel] = useState(preferredModel ?? '');

  useEffect(() => {
    if (open) return;
    setDraftPolicy(policy);
    setDraftModel(preferredModel ?? '');
  }, [open, policy, preferredModel]);

  const valid = draftPolicy === 'AUTO' || draftModel.trim().length > 0;

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<Iconify icon="solar:settings-bold-duotone" width={17} />}
        onClick={() => setOpen(true)}
      >
        {policy === 'AUTO' ? '自动模型' : preferredModel ?? '指定模型'}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
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
            <TextField
              fullWidth
              label="模型标识"
              name="agent-preferred-model"
              autoComplete="off"
              value={draftModel}
              onChange={(event) => setDraftModel(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 128, spellCheck: false } }}
              sx={{ mt: 2 }}
            />
          ) : (
            <Box sx={{ height: 8 }} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button
            variant="contained"
            disabled={!valid}
            loading={saving}
            onClick={async () => {
              const saved = await onSave(
                draftPolicy,
                draftPolicy === 'MANUAL' ? draftModel.trim() : null
              );
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
