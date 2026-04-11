import type { CreatePortfolioRequest } from 'src/api/portfolio';

import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

// ----------------------------------------------------------------------

interface PortfolioCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: CreatePortfolioRequest) => Promise<void>;
  submitting: boolean;
}

export function PortfolioCreateDialog({
  open,
  onClose,
  onConfirm,
  submitting,
}: PortfolioCreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialCash, setInitialCash] = useState('1000000');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setInitialCash('1000000');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入组合名称');
      return;
    }
    const cash = parseFloat(initialCash);
    if (Number.isNaN(cash) || cash < 0) {
      setError('初始资金不能为负数');
      return;
    }
    setError('');
    await onConfirm({
      name: name.trim(),
      description: description.trim() || undefined,
      initialCash: cash,
    });
  };

  return (
    <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>新建组合</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="组合名称"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 100 }}
            helperText={`${name.length}/100`}
            disabled={submitting}
          />
          <TextField
            label="描述（可选）"
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            inputProps={{ maxLength: 500 }}
            helperText={`${description.length}/500`}
            disabled={submitting}
          />
          <TextField
            label="初始资金"
            type="number"
            value={initialCash}
            onChange={(e) => setInitialCash(e.target.value)}
            slotProps={{ htmlInput: { min: 0, step: 10000 } }}
            disabled={submitting}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !name.trim()}
          loading={submitting}
        >
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
}
