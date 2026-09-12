import type { StockSearchItem } from 'src/api/stock';
import type { PortfolioCashMovementType } from 'src/api/portfolio';

import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import {
  recordPortfolioCashEvent,
  createPortfolioAccountingIdempotencyKey,
} from 'src/api/portfolio';

import { DatePicker } from 'src/components/date-picker';
import { StockSearchAutocomplete } from 'src/components/stock-search-autocomplete';

// ----------------------------------------------------------------------

const CASH_TYPES: Array<{ value: PortfolioCashMovementType; label: string }> = [
  { value: 'DEPOSIT', label: '入金' },
  { value: 'WITHDRAWAL', label: '出金' },
  { value: 'DIVIDEND', label: '现金分红' },
  { value: 'FEE', label: '其他费用' },
  { value: 'TAX', label: '其他税费' },
];

interface PortfolioCashEventDialogProps {
  open: boolean;
  portfolioId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PortfolioCashEventDialog({
  open,
  portfolioId,
  onClose,
  onSuccess,
}: PortfolioCashEventDialogProps) {
  const [eventType, setEventType] = useState<PortfolioCashMovementType>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [stock, setStock] = useState<StockSearchItem | null>(null);
  const [memo, setMemo] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => dayjs());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEventType('DEPOSIT');
    setAmount('');
    setStock(null);
    setMemo('');
    setEffectiveDate(dayjs());
    setError('');
  }, [open]);

  const handleSubmit = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('请输入有效金额');
      return;
    }
    if (eventType === 'DIVIDEND' && !stock) {
      setError('现金分红必须选择股票');
      return;
    }
    if (!effectiveDate?.isValid()) {
      setError('请选择有效生效日');
      return;
    }
    if (effectiveDate.isAfter(dayjs(), 'day')) {
      setError('生效日不能晚于今天');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await recordPortfolioCashEvent({
        portfolioId,
        eventType,
        amount: parsedAmount,
        tsCode: eventType === 'DIVIDEND' ? stock?.tsCode : undefined,
        effectiveDate: effectiveDate.format('YYYYMMDD'),
        idempotencyKey: createPortfolioAccountingIdempotencyKey('cash'),
        memo: memo.trim() || undefined,
      });
      onClose();
      onSuccess();
    } catch {
      setError('现金记账失败，请核对余额与生效日');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>记录现金事件</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            size="small"
            label="事件类型"
            value={eventType}
            onChange={(event) => setEventType(event.target.value as PortfolioCashMovementType)}
            disabled={submitting}
          >
            {CASH_TYPES.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            type="number"
            label="金额（元）"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            slotProps={{ htmlInput: { min: 0.0001, step: 0.01 } }}
            disabled={submitting}
          />
          {eventType === 'DIVIDEND' ? (
            <StockSearchAutocomplete
              label="分红标的"
              value={stock}
              onChange={setStock}
              disabled={submitting}
              fullWidth
            />
          ) : null}
          <DatePicker
            label="生效日"
            value={effectiveDate}
            onChange={(value) => value && setEffectiveDate(value)}
            maxDate={dayjs()}
            disabled={submitting}
            sx={{ width: 1 }}
          />
          <TextField
            size="small"
            label="备注（选填）"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 200 } }}
            disabled={submitting}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSubmit} loading={submitting}>
          确认记账
        </Button>
      </DialogActions>
    </Dialog>
  );
}
