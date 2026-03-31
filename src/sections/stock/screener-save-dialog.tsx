import { useState, useEffect } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

// ----------------------------------------------------------------------

type ScreenerSaveDialogProps = {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  loading?: boolean;
  defaultName?: string;
  defaultDescription?: string;
};

// ----------------------------------------------------------------------

export function ScreenerSaveDialog({
  open,
  onClose,
  onSave,
  loading = false,
  defaultName = '',
  defaultDescription = '',
}: ScreenerSaveDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [nameError, setNameError] = useState('');

  // 每次打开时重置表单
  useEffect(() => {
    if (open) {
      setName(defaultName);
      setDescription(defaultDescription);
      setNameError('');
    }
  }, [open, defaultName, defaultDescription]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('策略名称不能为空');
      return;
    }
    if (trimmedName.length > 50) {
      setNameError('策略名称不超过 50 个字符');
      return;
    }
    setNameError('');
    await onSave(trimmedName, description.trim() || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{defaultName ? '更新策略' : '保存选股策略'}</DialogTitle>

      <DialogContent
        sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <TextField
          autoFocus
          label="策略名称"
          size="small"
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          error={Boolean(nameError)}
          helperText={nameError || `${name.length}/50`}
          inputProps={{ maxLength: 50 }}
          required
        />

        <TextField
          label="描述（可选）"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          helperText={`${description.length}/200`}
          inputProps={{ maxLength: 200 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" loading={loading}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
