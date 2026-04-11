import type { HoldingDetailItem, UpdateHoldingRequest } from 'src/api/portfolio';

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

interface HoldingEditDialogProps {
  open: boolean;
  holding: HoldingDetailItem | null;
  onClose: () => void;
  onConfirm: (data: UpdateHoldingRequest) => Promise<void>;
  submitting: boolean;
}

export function HoldingEditDialog({
  open,
  holding,
  onClose,
  onConfirm,
  submitting,
}: HoldingEditDialogProps) {
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && holding) {
      setQuantity(String(holding.quantity));
      setAvgCost(String(holding.avgCost));
      setError('');
    }
  }, [open, holding]);

  const handleSubmit = async () => {
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      setError('请输入有效的持仓数量');
      return;
    }
    const cost = parseFloat(avgCost);
    if (Number.isNaN(cost) || cost <= 0) {
      setError('请输入有效的平均成本');
      return;
    }
    if (!holding) return;
    setError('');
    await onConfirm({ holdingId: holding.id, quantity: qty, avgCost: cost });
  };

  return (
    <Dialog open={open} onClose={!submitting ? onClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>编辑持仓</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {holding && (
            <Box>
              <TextField
                label="股票代码"
                value={holding.tsCode}
                disabled
                fullWidth
                sx={{ mb: 1 }}
              />
              <TextField
                label="股票名称"
                value={holding.stockName}
                disabled
                fullWidth
              />
            </Box>
          )}
          <TextField
            label="持仓数量（股）"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            slotProps={{ htmlInput: { min: 1, step: 100 } }}
            disabled={submitting}
          />
          <TextField
            label="平均成本（元/股）"
            type="number"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
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
          disabled={submitting}
          loading={submitting}
        >
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
