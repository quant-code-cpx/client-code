import type { StrategyDraft } from 'src/api/strategy-draft';

import { useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { createDraft } from 'src/api/strategy-draft';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  config: Record<string, unknown>;
  onClose: () => void;
  onSuccess: (draft: StrategyDraft) => void;
};

export function BacktestDraftSaveDialog({ open, config, onClose, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入草稿名称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const draft = await createDraft({ name: name.trim(), config });
      setName('');
      onSuccess(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>保存为草稿</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="草稿名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 100 }}
          error={Boolean(error)}
          helperText={error || ' '}
          sx={{ mt: 1 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || !name.trim()}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
