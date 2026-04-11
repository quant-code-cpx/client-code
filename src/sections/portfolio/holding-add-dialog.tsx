import type { AddHoldingRequest } from 'src/api/portfolio';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { stockApi } from 'src/api/stock';

// ----------------------------------------------------------------------

interface StockOption {
  tsCode: string;
  label: string;
}

function useStockSearch() {
  const [options, setOptions] = useState<StockOption[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (keyword: string) => {
    if (!keyword || keyword.length < 1) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await stockApi.list({ keyword, pageSize: 20 });
      setOptions(
        (res.items ?? []).map((s) => ({
          tsCode: s.tsCode,
          label: `${s.tsCode} ${s.name ?? ''}`.trim(),
        }))
      );
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  return { options, loading, search };
}

// ----------------------------------------------------------------------

interface HoldingAddDialogProps {
  open: boolean;
  portfolioId: string;
  onClose: () => void;
  onConfirm: (data: AddHoldingRequest) => Promise<void>;
  submitting: boolean;
}

export function HoldingAddDialog({
  open,
  portfolioId,
  onClose,
  onConfirm,
  submitting,
}: HoldingAddDialogProps) {
  const { options, loading, search } = useStockSearch();
  const [selectedStock, setSelectedStock] = useState<StockOption | null>(null);
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setSelectedStock(null);
    setQuantity('');
    setAvgCost('');
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedStock) {
      setError('请选择股票');
      return;
    }
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
    setError('');
    await onConfirm({ portfolioId, tsCode: selectedStock.tsCode, quantity: qty, avgCost: cost });
    handleClose();
  };

  return (
    <Dialog open={open} onClose={!submitting ? handleClose : undefined} maxWidth="sm" fullWidth>
      <DialogTitle>添加持仓</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Autocomplete
            options={options}
            loading={loading}
            getOptionLabel={(o) => o.label}
            filterOptions={(x) => x}
            value={selectedStock}
            onChange={(_, v) => setSelectedStock(v)}
            onInputChange={(_, v) => search(v)}
            renderInput={(params) => (
              <TextField {...params} label="搜索股票" placeholder="输入代码或名称" required />
            )}
          />
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
        <Button onClick={handleClose} disabled={submitting}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !selectedStock}
          loading={submitting}
        >
          添加
        </Button>
      </DialogActions>
    </Dialog>
  );
}
