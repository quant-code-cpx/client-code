import type { PortfolioListItem, UpdatePortfolioRequest } from 'src/api/portfolio';

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

interface PortfolioEditDialogProps {
  open: boolean;
  portfolio: PortfolioListItem | null;
  onClose: () => void;
  onConfirm: (data: UpdatePortfolioRequest) => Promise<void>;
  submitting: boolean;
}

export function PortfolioEditDialog({
  open,
  portfolio,
  onClose,
  onConfirm,
  submitting,
}: PortfolioEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && portfolio) {
      setName(portfolio.name);
      setDescription(portfolio.description ?? '');
      setError('');
    }
  }, [open, portfolio]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('请输入组合名称');
      return;
    }
    if (!portfolio) return;
    setError('');
    await onConfirm({
      id: portfolio.id,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>编辑组合</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="组合名称"
            required
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
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
