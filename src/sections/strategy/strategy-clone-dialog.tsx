import type { Strategy } from 'src/api/strategy';

import { useState } from 'react';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

// ----------------------------------------------------------------------

interface StrategyCloneDialogProps {
  open: boolean;
  strategy: Strategy | null;
  onClose: () => void;
  onConfirm: (name: string) => Promise<void>;
  submitting: boolean;
}

export function StrategyCloneDialog({
  open,
  strategy,
  onClose,
  onConfirm,
  submitting,
}: StrategyCloneDialogProps) {
  const defaultName = strategy ? `${strategy.name} - 副本` : '';
  const [name, setName] = useState(defaultName);

  const handleOpen = () => {
    setName(strategy ? `${strategy.name} - 副本` : '');
  };

  const handleConfirm = async () => {
    await onConfirm(name.trim() || defaultName);
  };

  return (
    <Dialog
      open={open}
      onClose={!submitting ? onClose : undefined}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ onEnter: handleOpen }}
    >
      <DialogTitle>克隆策略</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          从 <strong>{strategy?.name}</strong> 克隆一份新策略，版本重置为 v1。
        </DialogContentText>
        <TextField
          autoFocus
          fullWidth
          label="新策略名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          inputProps={{ maxLength: 100 }}
          helperText={`${name.length}/100`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={submitting || !name.trim()}
          loading={submitting}
        >
          确认克隆
        </Button>
      </DialogActions>
    </Dialog>
  );
}
